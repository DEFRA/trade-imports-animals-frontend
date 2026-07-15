# L3 adversarial verification — a11y-nojs-pe — C1

**Claim (C1):** A's obligation model is *structurally incapable* of carrying any presentational
information (type, widget, copy, label, hint, autocomplete token), and this is *enforced at server
boot* — so every a11y property is re-typed per template with nothing able to derive or audit it
centrally.

**Verdict: REFUTED.** The central assertion — structural incapability, enforced at boot — does not
survive contact with `obligation-purity.js`. The guard the claim leans on does not inspect
obligation *fields* at all; it inspects *import specifiers*. A's model would accept
`autocomplete: 'postal-code'` on an obligation today, boot cleanly, and pass the whole unit suite.
This is the "not built" vs "cannot be built" conflation, and it is load-bearing: the L2 write-up
uses it to conclude "You must delete the guard to begin" and "retrofitting B here is not a change to
A, it is a replacement of A" (`L2-a11y-nojs-pe.md:110-124`). That conclusion is unsupported.

## 1. The cited quote is real; the enforcement claim is not

`docs/obligation-model.md:34-42` verified verbatim: "There is deliberately no `type`, no copy, no
widget choice and no validation on an obligation." Note the word **deliberately** — the doc claims a
*convention*, not an impossibility. The claim upgrades this to a structural bar. The doc does not.

`obligation-purity.js` (root of the spike, **not** `engine/` as the claim states) is 46 lines. What
it actually does:

```js
const SPECIFIER_RE = /(?:from|import)\s*['"]([^'"]+)['"]/g       // :8
export const isSidewaysObligationImport = (s) => /(^|\/)obligations\.js$/.test(s)      // :10-11
export const isReferenceServiceImport  = (s) => /(^|\/)services\/[^/]+\/index\.js$/.test(s)  // :13-14
export function assertObligationPurity() {                        // :19
  // read each features/<f>/obligations.js as TEXT, matchAll(SPECIFIER_RE),
  // push an offender for any specifier that is neither of the two shapes above  // :30-36
}
```

It reads source **text**, regexes out **import specifiers**, and throws if one is not
`*/obligations.js` or `services/<x>/index.js`. It never parses an object literal. It never looks at
a key. `obligation-purity.test.js` (49 lines) confirms the scope: every assertion is about a
specifier string (`'../../shared/kit.js'`, `'joi'`, `'../../engine/index.js'`). There is **no**
key-whitelist, **no** schema, **no** `Object.keys` check anywhere in `registry.js`,
`flow/dispatch.js`, `engine/evaluate/reconcile.js` or `contract.test.js`, and **no** snapshot test
pinning obligation shape (`grep -rln "toMatchSnapshot|toMatchInlineSnapshot"` → zero hits).

Therefore:

- `export const postalOrZipCode = { id: 'postalOrZipCode', autocomplete: 'postal-code', widget: 'input', label: 'Postal or zip code' }`
  adds **zero imports** → `assertObligationPurity()` passes → server boots → engine ignores the
  unknown keys → a `kit.field(obligation)` helper or a njk macro reads them. Nothing in A stops
  this. The guard is not even in the way.
- Worse for the claim: the guard **explicitly permits** `services/<name>/index.js`
  (`:13-14`, `:16-17`). So even an obligation that *imports* its copy/widget/option data passes,
  provided that data lives under `services/`. A presentational registry at
  `services/copy/index.js` is admissible under the guard as written. The rule is a *path shape*,
  not a semantic check.

## 2. The vocabulary is already open — proof in-tree

`docs/obligation-model.md:14-29` lists nine fields and says "That is the whole vocabulary". It is
not. `features/origin/obligations.js:4` and `features/commodities/obligations.js:6` carry
**`enforcedAt: 'continue'`**, a tenth key absent from that table, read by
`flow/prerequisites.js:11` (`if (obligation.enforcedAt !== 'continue') continue`). Someone wanted a
new obligation fact (DESIGN-DELTA #6), added a key, wrote one consumer, and shipped. No guard fired.
That is *exactly* the mechanism you would use to add `autocomplete`, and it has already been
exercised for a non-presentational fact.

Also: `features/commodities/obligations.js:83` calls `commodities.permanentAddressCommodities()` —
the obligation model already imports a **reference-data service** to source a value domain. A's
model therefore already reaches out for *data about option membership*; the step to option *lists*
for a widget is not a new kind of coupling.

## 3. Counter-example to "nothing able to derive it centrally"

The claim's own evidence cites `features/commodities/animal-identification.controller.js:283-316` as
proof of hand-typed tokens. Read the surrounding function and it is the opposite of what the claim
says. `addressFieldsFor()` (`:272-319`) builds a **list of field descriptors**:

```js
const input = (id, label, extra = {}) => ({ kind: 'input', id: fieldName(id, index), label, value, error, ...extra })
input('postalOrZipCode', 'Postal or zip code', { classes: 'govuk-input--width-10', autocomplete: 'postal-code' })
{ kind: 'select', id: fieldName('country', index), label: 'Country', items: addressCountryItems(...) }
input('telephoneNumber', 'Telephone number', { type: 'tel', classes: '...', autocomplete: 'tel' })
```

— `kind` (widget), `label` (copy), `hint`-equivalent `classes`, `type`, `autocomplete`, `items`
(option domain), `error`. This descriptor list is consumed by a **generic dispatch loop** in
`features/commodities/_identification-card.njk:38-54`:

```njk
{% for field in card.addressFields %}
  {% if field.kind == "select" %} ... {% else %} ... autocomplete: field.autocomplete, ...
```

That is a field-widget dispatch table with a data-driven renderer — the very thing
`docs/features.md:333-338` says must never appear ("The moment a `kit.renderPage(spec)` appears, the
rejected generic config-engine has sneaked back in"). It appears. It boots. **The doc the claim
credits is not honoured by the code it describes.** The descriptors merely originate in a controller
instead of the model — a *placement* choice, one hop from the model, with no guard between them.

Second counter-example: `shared/kit.js:32-39` — `errorSummary(fieldErrors)` **derives** the summary
list centrally, mapping each field id to `{ text, href: '#'+field }`. The 19 templates the claim
counts do not re-type an error summary; they `{% include %}` **one shared partial**
(`shared/error-summary.njk`) fed by that one central helper. Verified: all 19 hits are includes of
`error-summary.njk`. The a11y contract (summary → in-page link → field id) is derived in exactly one
place. Third: `docs/features.md:253-257` — CYA Change-link hrefs are **derived** through the
dispatch seam (`pagePath(slugOfPage(pageOfObligation(id)))`), so the Change links cannot orphan.

## 4. What IS true, and the one genuinely structural bit the claim missed

- Obligations carry no presentational key **today** — verified across `features/*/obligations.js`
  (origin: `{ id, required, enforcedAt }`, `{ id, required, activatedBy, wipeOnExit }`; addresses:
  `{ id, required }` only).
- Autocomplete tokens **are** hand-typed: `features/addresses/create-address.njk:20,28,36,45,62,79,88`
  (7 verified), plus the controller descriptors above, plus `private-transporter-details.njk`.
- There **is** no central audit: no axe/pa11y, no test asserting "every text input carries an
  autocomplete token", no schema over obligation keys. Nothing would fail if you missed one.
- `spec/journey-spec.json` *does* hold `label` / `widget` / `hint` per field centrally
  (`:546-548`, `:572-576`, `:599-606`, …) — but **no runtime module imports it** (only
  `PROVENANCE.md` references it). So A has a central presentational record it chose not to wire.
  Again: not built, not un-buildable.
- **The real obstacle the claim did not find — granularity, not purity.** The 21 hand-typed tokens
  hang off DOM inputs that have **no obligation of their own**. `features/addresses/obligations.js`
  models `consignor`, `consignee`, `importer`, `placeOfOrigin`, `placeOfDestination` as five opaque
  scalars; `permanentAddress` (`features/commodities/obligations.js:80-83`) likewise. The address
  sub-fields (`addressLine1`, `postalOrZipCode`, `telephoneNumber`, `emailAddress`, …) exist only in
  controller/template code. So a model-driven `autocomplete` derivation would have **nothing to
  attach to** for precisely the fields the claim counts, without first decomposing the address blobs
  into `item[]` structures (which the model *can* express — `collection`/`item` is recursive — but
  which would change the store shape and the persistence mappers). That is a real cost, and it is a
  *modelling-depth* cost, not a purity bar.

## 5. Strongest true version

See `amendedClaim` in the return value. The retrofit consequence flips: adding derivable a11y to A
is **additive** (new keys + a `kit.field(obligation, opts)` helper — the "cheap 80%" the L2 already
identified at `:130-133`), not a paradigm replacement. The guard does not have to be deleted; it
would not even notice. The cost centres are (a) decomposing the address/party blobs into real
sub-obligations, and (b) the social/doc convention that says don't — which is a decision, revisable,
not a structure.

## Searches run

- `grep -rn "assertObligationPurity|obligation-purity|ObligationPurity"` over the A spike → 5 code
  hits, 6 doc hits; the file is at the spike **root**, not `engine/` (claim's path is wrong).
- Full read of `obligation-purity.js` (46 LOC) and `obligation-purity.test.js` (49 LOC).
- Full read of `docs/obligation-model.md` (328 LOC).
- `grep -rn "Object.keys|allowedKeys|ALLOWED|unknown key|schema"` over `contract.test.js`,
  `registry.js`, `obligation-purity.test.js` → zero hits.
- `grep -rln "toMatchSnapshot|toMatchInlineSnapshot"` over the spike → zero hits.
- `grep -rn "enforcedAt"` → 10th key, read by `flow/prerequisites.js:11`, absent from the doc's
  vocabulary table.
- `grep -rln "autocomplete"` → 7 files; read `create-address.njk`,
  `animal-identification.controller.js:255-334`, `_identification-card.njk`.
- `grep -rln "error-summary.njk"` under `features/` → 19 templates, all *including* the one shared
  partial; read `shared/kit.js:1-70`.
- `grep -rln "journey-spec"` → runtime consumers: none.
