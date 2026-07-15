# L2 — i18n, copy and content model — A (live-animals) vs B (flow-layer)

Clones (read-only):
- A: `workareas/model-comparison/clone-live-animals` @ b6ac2ed — `prototypes/standalone/live-animals/`
- B: `workareas/model-comparison/clone-flow-layer` @ d59b432 — `prototypes/journey-config-spikes/EUDPA-249-flow-layer/`

**VERDICT: B-better. Decisively, and it is a MODEL win, not a finish-line win.**

---

## 1. Rationale

This is the one dimension where "A is further along" does not even apply — A is not
further along here, it is at zero. A has **0 locale files, 0 keys, 0 resolver, 0
coverage test** (`find … -iname "*locale*" -o -iname "*i18n*" -o -iname "en.json"`
over A's whole root returns nothing). B has a resolver (`lib/i18n.js`, 82 LOC), a
single catalogue (`locales/en.json`, 362 leaf keys), a keyed model manifest, 8
templates with literally zero copy in them, and a build-time gate
(`i18n-coverage.test.js`, 221 LOC) that fails when a declaration-site key is missing.

But the reason B wins is **not** "B built it and A didn't" — that would be exactly the
breadth-masquerading-as-quality error this exercise exists to avoid. B wins because
its **model has a seam that A's model does not have**:

> B declares a field's **value domain (codes)** and its **display copy (message keys)**
> in one place — `staticEnum(OPTIONS, { labels })` (`domain/index.js:134-141, 342-352`)
> — and every consumer (widget, validation, CYA row, and the obligation's own
> conditionality predicate) derives from that one declaration. A's obligation carries
> **no `type`, no `options`, no copy at all** by explicit decision
> (`docs/decisions.md:272`, `docs/obligation-model.md:36-42`, boot-enforced by
> `obligation-purity.js:19-46`), so there is **no declaration site where code and
> label meet**. The relationship exists only as convention, split across a service
> stub and a controller, and nothing in A can see it, derive from it, or verify it.

The consequence shows up in the gates. B's predicates compare **locale-invariant
codes**: `fulfilments[transporterType.id] === 'commercial'` (`obligations.js:283`),
`LAND_TRANSPORT_MODES = ['railway','road-vehicle']` (`:332`),
`PASSPORT_COMMODITIES = ['0101','0102','01061900']` (`:601-605`). A's compare
**English display strings**: `includes: ['Railway','Road Vehicle']`
(`features/transport/obligations.js:22`), `equals: 'Commercial'` (`:34`),
`PASSPORT_COMMODITIES = ['Horse','Cow','Cat','Dog']`
(`services/commodities/stub.js:87`). Same requirement, same journey; one is
translatable, one is not.

### The correction I have to make to the Layer-1 read of A

L1-A calls this **structural** — "the obligation model CANNOT EXPRESS 'gate on the
code behind the label'". **That is overstated, and going back to source refutes it.**
A's model gates on codes in two of its twelve `activatedBy` sites already:

- `features/import-purpose/obligations.js:6` — `equals: 'internalMarket'` (a code;
  `services/import-reason-purpose/stub.js` holds the code→label map)
- `features/origin/obligations.js:15` — `equals: 'yes'`

Nothing in A's obligation vocabulary requires the operand to be a label. The
predicate compares against *whatever the controller committed*. For 10 of the 12
gates the controller committed an English label — a **data-modelling choice**
reinforced by a **wire-contract choice** (`notification-mapper.js:451` passes
`meansOfTransport` straight through and `skeleton-equivalence.test.js` pins the
payload byte-exact; `docs/services.md:47-50` explicitly instructs "do not add a
lookup"). It is expensive, it is entangled with persistence, and it is wrong — but it
is **mechanical, not structural**. Honest scoring matters more than a tidy story: A's
i18n retrofit is a big pile of mechanical work, not an impossibility.

A's genuinely structural gap is the smaller, quieter one: **the model has no slot in
which a value domain or a label map could ever live**, so four consumers re-declare
each field independently and nothing checks they agree. That is what B fixed.

### What B actually got right (transferable, cheap)

1. **Zero English in the model layer.** `evaluator.js` (519 LOC) + `engine/index.js`
   (601 LOC) emit only codes — `{ code: 'domain.string.maxLength' }`
   (`domain/index.js:80-83`), `errors.push({ code: group.requires.errorCode, … })`
   (`engine/index.js:530-535`). The rationale is written down and is statutory:
   *"Welsh support is a statutory requirement for Defra services, so inline English
   literals in evaluator functions were never viable"* (`obligations.md:2754-2757`).
   Note both sides independently reached "no copy in the model" — A by deleting copy
   (`decisions.md` #6), B by keying it. **B's version keeps the seam; A's version
   destroys it.** That is the whole comparison in one line.
2. **Zero-copy templates.** All 8 `.njk` (299 LOC) read end to end: not one
   user-facing literal. `shared/page.njk:5` states the invariant. Contrast A: 119
   literals across 32 templates.
3. **Automatic declaration-site coverage walks** (`i18n-coverage.test.js:78-124`) —
   ~50 LOC of tree/manifest walking that hard-fails on a missing key, plus a
   "collects at least one key" guard per block so a silently-broken walker fails too.
4. **`t()` vs `tOrNull()`** (`lib/i18n.js:47-67`) — visible dotted-path on a miss for
   copy; `null` for callers with an honest fallback (`tOrNull(labels?.[v]) ?? v`).

### Where B is weaker than its own documentation claims

- **No Welsh.** `en.json` is `readFileSync`-ed once at module scope
  (`lib/i18n.js:24-27`); `t()` has no locale param; no `cy.json`. ~93 `t()` call
  sites across 9 files, none with a request in scope.
- **No pluralisation at all.** `interpolate()` (`:69-75`) is a 7-line regex replace.
  Shipped copy reads "Select no more than 1 items" (`en.json:575`). Welsh has more
  plural categories, not fewer.
- **The gate has drifted.** Controller keys are hand-typed arrays
  (`i18n-coverage.test.js:37-76`, comment: *"Keep in sync with the t() calls"*). No
  `UNITS_KEYS` array exists at all despite 15 `t()` calls in
  `features/units/controller.js`. **18 of 362 keys (5%) used-but-ungated.** No
  orphan-key check either.
- **4 English literals survive in JS**, the worst on the CYA critical path:
  `keyLabelFor()` (`features/check-your-answers/controller.js:139-151`) builds
  `"(animal N on commodity line M)"` in English and feeds it into
  `t('cya.promptEnterValue', { label })` (`:156`) — a Welsh prompt would carry an
  English parenthetical mid-sentence.
- **`obligations.md:2749` is wrong**: the failure code does *not* double as the
  message key — `lib/format-domain-errors.js:21-68` is a hand-maintained 12-entry
  translation table, and `obligation.unitRecord.identifiersRequired`
  (`obligations.js:592`) has no `en.json` key at all.
- **Copy content is unenforced** (`docs/testing.md:593-628`, mutation 16: a subtle
  copy change passes all 385 tests, scored 0). Same gap as A — presence is gated,
  correctness is not.

Neither side has Welsh. Neither side has plurals. Neither side has content-design
provenance. But B is one day's threading away and A is ~1,145 sites away.

---

## 2. Asymmetric capability

### A-only (things B's content model structurally cannot express)

**A1 — Display copy sourced at runtime from a reference-data service.** A's option
labels come from services (`services/*/stub.js`, ~351 label lines across 10 services,
swappable for real MDM clients — `docs/services.md:45-47`). B's labels are a
**build-time key map** (`domain/index.js:342-352`) and its coverage test *enforces
build-time-ness*: `collectDomainLabelKeys()` (`i18n-coverage.test.js:103-113`) walks
`entry.labels` and asserts `hasKey(value)` for every entry. A code that MDM invents at
runtime has no key, so B's widget falls back to rendering the raw code
(`tOrNull(labels?.[v]) ?? v`) and the gate cannot cover it. B admits the collision in
its own catalogue: `en.json:396-397` ships `"PLACEHOLDER 1 — real values come from
MDM"`. Countries, ports and commodities are all MDM-sourced in the real requirement
set, so this is not hypothetical.

**A2 — Copy parameterised by runtime state at the page-copy layer.** B's presentation
contract is `forObligation(obligation)` → a fixed `{pageTitle, legend, hint}` triple
with **no params and no state argument** (`lib/presentation.js:419-433`). When B needed
instance-scoped copy it could not express it in the catalogue and escaped into English
template literals in a controller (`check-your-answers/controller.js:139-151`). A does
this natively — copy is controller-authored, so
`` `Enter details for ${species} ${records + 1} of ${cap}` ``
(`features/commodities/animal-identification.controller.js`) is ordinary. Honest
caveat: A's version is equally untranslatable — A's advantage is *expressiveness*, not
correctness. The point for the third option is that **the copy layer needs a
params/state channel at the page-copy declaration site**, and B's does not have one.

### B-only (things A's content model structurally cannot express)

**B1 — One model-level declaration from which the widget, the validation, the CYA
label, and the conditionality predicate all derive.** B: `staticEnum(options, {labels})`
(`domain/index.js:134-141`), consumed by `lib/field-widgets.js` (widget + option
labels), the evaluator (validation), CYA, and the obligation's `applyTo` predicate —
all from one place. A **cannot express this at all**: `decisions.md` #6 deleted `type`
and `options` from the obligation, `docs/obligation-model.md:36-42` states the model
carries "no type, no copy, no widget choice and no validation", and
`obligation-purity.js:19-46` throws at boot if an `obligations.js` imports anything
other than another `obligations.js` or a reference-data service. So there is nowhere on
an A obligation to put a value domain, and each of A's four consumers re-declares the
field independently — which is exactly why the V4 Standard Address Block, defined
**once** in the spec (`spec/journey-spec.json:194`), is re-typed in ~75 places across
3 templates and 3 controllers. Adopting B1 in A means reversing a written, boot-enforced
architectural decision.

---

## 3. Retrofit — B's i18n into A

**Lands cleanly (no conflict with A's paradigm):** `lib/i18n.js` (82 LOC, verbatim),
`chrome.js`, the `t`/`tOrNull` miss policies, `format-domain-errors`'s
code→key dispatcher shape. A's `obligation-purity.js` guard is *not* an obstacle — B's
i18n lives at the browser seam too, and an A page/controller may import whatever it
likes.

**Does not land — A has no declaration sites to walk.** B's coverage gate is only
strong because B's copy is *declared* (flow `titleKey`, `OBLIGATION_KEYS`, domain
`labels`). A's copy is *authored*, in 32 `.njk` and 22 controllers. So the retrofit is
not "drop in the gate", it is "build A a presentation registry and a keyed flow spine
first, then the gate becomes possible". Order of work and honest sizing:

| Work | Sites | Nature |
|---|---|---|
| Extract ~428 inline English literals to `en.json` | 32 `.njk` + 22 controllers + `kit.js` | Mechanical; a build loop closes it |
| Rewrite tests that pin the exact English | **711** (95 unit + 616 E2E — `t2-hub-copy.test.js:59-66`, `prototypes/e2e/live-animals.spec.js`) | The real cost. Every `getByRole({name:'Save and continue'})` is locale-locked |
| Introduce a presentation/title registry so the gate has something to walk | ~27 pages (spec already holds the titles — `spec/journey-spec.json`, currently imported **0** times) | New structure; A has none |
| Move the 3 label-valued fields to codes | 10 of 12 `activatedBy` operand lists + 3 controllers + CYA lookups | Mechanical (A already does code→label for `import-reason-purpose`, `certification-purposes`, `countries`) — **not structural**, contra L1-A |
| Preserve the wire contract while doing it | `notification-mapper.js:451` + `skeleton-equivalence.test.js` byte-exact pin | Add code→label at the mapper; re-pin. Load-bearing in A; **B has no persistence layer and therefore no answer here at all** |
| De-duplicate the address block | ~75 sites (9 labels ×3, 16 messages ×3) | Falls out of the catalogue for free |
| Delete `key.toLowerCase()` (CYA visually-hidden) and `plural()` | 2 helpers | B's equivalents (`humaniseId`, no plurals) are *also* wrong — steal neither |
| Pages B has never written (dashboard, declaration, confirmation, cdp-uploader, amend-and-resubmit) | ~150 strings | No B counterpart; author from scratch |
| Dates (`toLocaleDateString('en-GB')` ×3) + missing `htmlLang` | ~4 | B has no date-locale story either |

**What A has that B has no answer for:** the persisted wire contract (V4 display labels,
byte-exact skeleton pin) and MDM-sourced runtime labels. Both must be designed *into*
B's catalogue model, not assumed away.

## 4. Retrofit — A's content model into B

This is a **downgrade with no upside** and should not be done. A's content model *is*
"inline English, page-owned" — importing it into B means deleting `en.json`, the
resolver, the gate, and the labels-as-keys rule, and breaking the zero-copy-template
invariant (`shared/page.njk:5`) the moment A's `.njk` files arrive.

The only A-side assets worth moving into B are **not** its copy model:
- **The reference-data service seam** (`docs/services.md`) — B *needs* this for MDM
  (A1). Cost in B: `collectDomainLabelKeys()` (`i18n-coverage.test.js:103-113`) asserts
  every `labels` value resolves in `en.json`; a service-resolved label has no key, so
  dynamic enums must be exempted from the walk — which weakens B's best gate. That
  trade needs designing, not hand-waving.
- **The spec as content source of truth** (`spec/journey-spec.json` holds all 27 page
  titles) — B's 362 strings are hand-authored with no provenance (`NEXT.md:359-362`).
  A doesn't wire the spec either (0 runtime imports), so this is a *third-option* idea
  both sides are missing, not an A capability.
- **Parameterised page copy** (A2) — add a params/state channel to `forObligation()`
  and delete `keyLabelFor()`'s English literals.

---

## 5. Shopping list for the third option

1. **B's `domain` seam**: `{ type, options: codes, labels: keys }` as the single
   declaration, with widget/validation/CYA/predicate all deriving from it. (B1)
2. **B's zero-English-in-the-model rule** + coded engine failures + `t`/`tOrNull`.
3. **B's automatic declaration-site coverage walks** — and **replace** the hand-typed
   `HUB_KEYS`/`CYA_KEYS`/`COMMODITY_LINES_KEYS` arrays with a source scan
   (`/t\(['"]([\w.]+)['"]/` over `features/**` + `lib/**`), which closes the 18-key
   drift *and* adds the missing orphan-key check in ~30 LOC.
4. **A params/state channel on page copy** (fixes B's CYA English parenthetical). (A2)
5. **A runtime label path for MDM-sourced enums**, explicitly exempted from the
   build-time key walk and documented as such. (A1)
6. **A real message formatter** (ICU / `i18next`) — neither side has plurals; B's
   82-LOC resolver is a small blast radius to swap.
7. **A copy-content gate** — both sides score 0 on subtle copy mutation
   (`docs/testing.md:628`; A's `docs/limits.md:88`).
8. **Wire the spec's page titles into the runtime** — neither side does; it is the only
   available content source of truth.
