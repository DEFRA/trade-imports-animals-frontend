# L3 — Adversarial verification: testing-strategy, claim T2

**Claim under test.** B can unit-test model→rendered-widget conformance because the rendered field is
a *pure function of the model*; A **structurally cannot**, because its obligation carries no type,
label or widget — *"there is nothing in A's model for a rendered input to conform to."* Consequence:
on A, add a field, wire the handler, forget the `.njk` input, and the entire suite stays green (an
OPTIONAL forgotten field is caught by nothing at all).

**Verdict: AMENDED.** The consequence is true and I could not break it. The *reason given* for the
consequence is wrong in a way that matters for the shopping list: it upgrades an unbuilt test into an
impossible one, and it overstates B's purity.

---

## 1. What the cited evidence actually shows (all quotes verified)

### B — the derivation chain is real

- `lib/build-field-descriptors.js:58-110` — verified. `domainEntry = domain.get(entry.obligation.id)`
  (:69), `options` only when `domainEntry?.type === 'enum'` (:72), then `pickWidget({obligation,
  entry: domainEntry, options, id, value, legend, hint, labels: domainEntry?.labels, error,
  fieldErrors})` (:84-97).
- `lib/field-widgets.js:337-343` — verified. `pickWidget` runs the ordered `rules` array, first
  non-null wins.
- Rule dispatch on `entry.type` — verified at `:82` (`entry?.type !== 'enum'` → checkboxes),
  `:115` (enum → radios), `:150` (enum → select), `:199` (`address`), `:273` (`date`),
  `:298` (`integer`), `:318` (text).
- One generic template — verified. `find -name "*.njk"` over B's tree returns **8** files, and the
  only field template is `shared/partials/fields.njk`. The others are layout, page, error-summary,
  CYA, two list views and the hub.
- `routes.test.js:390-408` — verified. HTTP-level render (`server.inject`) asserting
  `name="commercialTransporter__addressLine1"` etc. reaches the DOM.
- `lib/field-widgets.test.js` — verified, 8 `it(` sites (`:9,28,45,63,79,94,109,122`), all example
  tests on `pickWidget` with synthetic domain entries.

### A — the model really is type-less

- `docs/obligation-model.md:14-28` — verified. 10-key table: `id, required, requiredAtLeastOne,
  requiredOneOf, collection, item, system, renderOnly, activatedBy, wipeOnExit, maxEntriesFrom`.
  No `type`, no `label`, no `widget`.
- `docs/obligation-model.md:34-42` ("Why so thin") — *"There is deliberately no `type`, no copy, no
  widget choice and no validation on an obligation."* Verified, and the **code honours the doc**:
  32 hand-authored `.njk` files, no derivation layer.
- *A's unit suite never renders* — verified, and **stronger than the claim states**:
  `grep -rn "nunjucks" <A prototype tree>` returns **nothing at all** — not in tests, not in source.
  Rendering is done by the parent app's Vision/Nunjucks env.
- `contract.test.js:54-77` — verified. `cases` is a hand-written array of `{collects, handler,
  payload}`; e.g. origin's payload is a synthetic literal posted straight to the POST handler. No
  template is involved.

**So the failure mode is real.** I confirmed it end-to-end and it is *worse* than the claim says:

- `features/commodities/consignment-details.controller.js:14` and
  `features/commodities/animal-identification.controller.js:20` both declare `collects: []`. Only
  `search.controller.js:8` collects (`kit.collectsFrom(obligations)` → the `commodityLines` root),
  and `flow/dispatch.js:15-24` `ownerOfObligation` resolves any nested obligation to its **ancestor**.
  Therefore *every* item-level obligation on A's most complex pages is "collected" by the search page
  by ancestry. Add an obligation to `animalIdentifiers.item`, forget the input: the boot totality
  assert (`dispatch.js:55-63`) **cannot fire**, the contract test posts a synthetic payload, nothing
  renders in unit, and an optional field never moves a task status so E2E is blind too. **Green.**

---

## 2. Counter-example hunt on A — where the claim breaks

### 2a. "There is nothing in A's model for a rendered input to conform to" is FALSE

A's own model doc states the opposite, twice:

> `docs/obligation-model.md:18` — *"`id` … The obligation's name. **Also the key in the answers map
> and the DOM field name — one string, three roles.**"*
>
> `:30-32` — *"Because `id` doubles as the store key and the DOM field name, a definition, its stored
> answer and its form input always line up — there is no mapping layer to drift."*

That **is** a conformance target: *every obligation a page collects must appear as a form control
named for its id.* It needs no `type`, no `label`, no `widget` — only the `id`, which A has. And the
code honours it: `features/import-reason/template.njk:12` is literally `name: "reasonForImport"`;
collection fields are `` `${id}-${index}` `` (`animal-identification.controller.js:116`).

Every ingredient for the test already exists in A's tree:

| Ingredient | Where it already is |
|---|---|
| page → obligation ids | `flow/dispatch.js:72` `collectsOf(pageId)`; `features/index.js:27-46` `dispatchPages` |
| template name + view model, per page | `engine/test-support.js:4-15` — `stubH.view = (view, context) => …` **captures the template path**; `driveHandler` returns `{ view: { view, context } }` (`:42-60`). `features/import-reason/controller.js:10,32` shows `view` is the njk path. |
| a Nunjucks env that resolves those paths | `src/config/nunjucks/nunjucks.js:12-19` — searchpath already includes `path.resolve(dirname, '../../../prototypes')`, which is exactly what `"standalone/live-animals/..."` template refs need. `nunjucks` is already a repo dependency. |

`nunjucks.render(captured.view + '.njk', captured.context)` + `expect(html).toContain('name="' + id)`
for each `collectsOf(page)` is a **~30-LOC test file with zero model change**. The claim's punchline
failure mode — *forget the `.njk` input* — is therefore **unbuilt, not unbuildable**. This is exactly
the "conflates not-built with cannot-be-built" trap, and it lands on the one sentence the claim is
built around.

### 2b. A already has a derived field-descriptor seam — on its hardest page

`features/commodities/animal-identification.controller.js:45-82` is a field-descriptor table:

```js
const TYPE_FIELDS = [
  { obligation: animalIdentifierPassport, id: 'animalIdentifierPassport', label: 'Passport number', hint: '…' },
  …
]
const typeApplies = (obligation, commodity) => obligation.activatedBy.includes.includes(commodity)   // :42-43
const fallbackApplies = (obligation, commodity) =>
  !includesUnion(obligation.activatedBy.notInUnionOf).includes(commodity)                             // :67-68
```

and `_identification-card.njk:22-32` renders `{% for field in card.fields %}` through **one generic
`govukInput` loop** — with `kind: 'input' | 'select'` (`controller.js:274,303`) for the address block.
This is *B's architecture, relocated*: descriptors carry real obligation **references**, the
render-or-not decision is computed **from the model's `activatedBy`**, and the template is generic.
A has simply put `type`/`label` on the **page** instead of the **obligation**.

Consequence for the claim: a conformance test **over that table** — "the ids in
`TYPE_FIELDS ∪ FALLBACK_FIELDS` cover every `animalIdentifiers.item` obligation this page owns" — is
expressible in plain JS today, no rendering and no model change. Verified absent:
`grep -rn "TYPE_FIELDS\|FALLBACK_FIELDS\|scopedFields" animal-identification.controller.test.js` →
**empty**. Again: unbuilt, not impossible.

### 2c. What A genuinely cannot do (the residue that survives)

Widget **kind**, **copy** and **option-list legality** cannot be conformed to A's model, because the
model does not carry them (`obligation-model.md:34-42`). "An enum with more than 5 options must render
a select, not radios" has no referent in A. That half of the claim survives every attack I made, and
it is structural.

---

## 3. Counter-example hunt on B — the premise is overstated

**"The rendered field is a pure function of the model" is false as written.** Two model-external,
hand-maintained inputs sit inside `lib/`:

1. **`OBLIGATION_MULTI`** (`field-widgets.js:56-62`) — a hand-written `Set` of obligation *names*
   (`transitedCountries`, `species`, `animalsCertifiedFor`), consulted at `:83`, `:116`, `:151` to
   choose checkboxes vs radios vs select. The domain does **not** carry array-ness:
   `domain/index.js:1080-1106` types `transitedCountries` as plain `type: 'enum'` — identical to a
   single-select. So **add a new multi-valued enum obligation and forget `OBLIGATION_MULTI`, and it
   silently renders as radios** (single-select) storing a scalar. Nothing derives it, no totality test
   guards it (`grep -rn OBLIGATION_MULTI` finds only the 3 use sites and one E2E comment at
   `e2e/journey.js:216` — **no test file**). This is B's own version of the very drift the claim
   accuses A of, one layer up.
2. **Copy** — `forObligation` → the 38-entry hand-maintained `OBLIGATION_KEYS` map with a
   `humaniseId()` fallback (per L2 §4c, re-checked): a new obligation gets a humanised label and no
   test fires.

**And the widget dispatch fails open.** The `text` rule (`field-widgets.js:317-334`) has **no type
guard** — it matches unconditionally, so `pickWidget` never returns null and
`build-field-descriptors.js:98` (`if (!chosen) continue`) is dead code. B even *tests* the fallback
("falls back to a text input when no domain entry exists", `field-widgets.test.js:109`). A new domain
`type` with no matching rule therefore renders a **text input, silently**. So B's model→widget
conformance is "derived where a rule exists, else text" — not total.

**What B's structure genuinely buys** (and this is the honest core of the claim): because there is no
per-field template, *the forgotten-input failure mode cannot occur* for any obligation that is
`presents`-ed and has a domain entry — and the totality gate for the domain entry exists and is
derived (`obligations/coverage.test.js:81-85`: every obligation has a domain entry or a written
`KNOWN_UNWIRED` reason). That is the real asymmetry, and it is about **centralised rendering plus a
domain-coverage gate**, not about `type` per se.

---

## 4. What I searched

- `find -name "*.njk"` both trees (A: 32 page/partial templates; B: 8, one field partial).
- `grep -rn "nunjucks"` over A's whole prototype tree → **empty** (confirms no render in any test *or*
  source; the env lives in `src/config/nunjucks/nunjucks.js`, whose searchpath already includes
  `prototypes`).
- `grep -rln "collectsOf\|dispatchPages"` over A → 40 hits; read `flow/dispatch.js`,
  `features/index.js`, `engine/test-support.js`, `contract.test.js:40-77`, `features/import-reason/{controller.js,template.njk}`,
  `features/commodities/{page.js,search.controller.js,consignment-details.controller.js,
  animal-identification.controller.js,_identification-card.njk,_species-quantities.njk}`.
- `grep -rn "TYPE_FIELDS\|FALLBACK_FIELDS\|scopedFields" animal-identification.controller.test.js` → empty.
- B: read `lib/build-field-descriptors.js` in full, `lib/field-widgets.js:1-62,60-140,180-344`,
  `routes.test.js:375-415`, `lib/field-widgets.test.js` (case list), `obligations/coverage.test.js`
  (assertions), `domain/index.js:1070-1106`; `grep -rn "OBLIGATION_MULTI"` across B's tree.

## 5. Net effect on the comparison

The asymmetry stands but shrinks, and its *cause* changes — which changes the shopping list:

- Copying B's **`type` on the obligation** is not the only way to close A's forgotten-input hole. A
  ~30-LOC render-totality test (id-is-the-DOM-name, page-owned `collects`, existing `stubH` capture)
  closes the *presence* half **today, with no model change**. Put that on the list; it is cheaper than
  the model change and independent of it.
- What `type` on the obligation genuinely buys is **widget-kind / copy / option-legality conformance**
  and the deletion of 32 hand-authored templates. That remains a real, permanent win for B.
- B's own presentation layer has two hand-maintained maps with silent fallbacks (`OBLIGATION_MULTI`,
  `OBLIGATION_KEYS`) and an unguarded catch-all text rule. A third option should carry the multi/array
  fact **in the domain entry** (e.g. `type: 'enum', multiple: true`) and make `pickWidget` **throw**
  on an unmatched type rather than fall through to text — otherwise it inherits B's drift with B's
  architecture.
