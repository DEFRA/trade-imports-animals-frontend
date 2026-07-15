# L3 — Adversarial verification — VE-1 (validation-errors)

**Verdict: AMENDED.** The direction survives; three of the claim's four
load-bearing specifics do not.

---

## What I searched

- Both cited files at the cited lines (A `lib/validate/validators.js:9`,
  `features/origin/controller.js:26-49`; B `domain/index.js:1150-1194`).
- `grep -rn "export const fields|export const schema|export const validators"`
  over A's whole tree — **zero hits**.
- `grep -rn "const fields|const schema|compose("` over A's `features/` — the
  full census of schema-construction sites.
- `grep -rn "journey-spec"` over A's tree.
- `grep -rn "\.describe("` over A's `lib/` + `analysis/`.
- A's `registry.js`, `contract.test.js`, `obligation-purity.test.js`,
  `features/origin/obligations.js`, `flow/prerequisites.js`.
- B's `domain/index.js` helper factories (`staticEnum` :134, `computedEnum`
  :148, `predicate` :163, `addressBlock` :197, `stringMaxLength` :288).
- B's three cited gates: `obligations/coverage.test.js`,
  `obligations/whitelists.test.js`, `i18n-coverage.test.js`.
- `grep -rn "domain.values()|domain.entries()"` over B's whole tree — the
  complete list of generic iterations over the registry.

---

## 1. VERIFIED — the quotes are real

- `lib/validate/validators.js:9` — `const single = (name, rule) => Joi.object({ [name]: rule }).unknown(true)`. Real, module-private.
- `features/origin/controller.js:26-49` — `const fields = () => compose(requiredOneOf('countryOfOrigin', …), oneOf(…), maxText('internalReferenceNumber', 58, …), pattern('internalReferenceNumber', /^[a-zA-Z0-9]*$/, …))`. Real. **Not exported.**
- `domain/index.js:1150-1194` — `export const domain = new Map([...])`, exactly **40 entries**, keyed by obligation id. Real.
- **Nothing in A exports a schema.** The grep for exported `fields`/`schema`/`validators` returns nothing. No Joi `.describe()` call exists anywhere in A. A's introspection tooling (`analysis/reachability.js`, `analysis/simulate.js`, `registry.js`) walks the obligation forest — and validation is invisible to all of it. **The core "A's value rules are not addressable today" is TRUE and I could not break it.**

## 2. REFUTED — "inside a controller-local closure"

The census (`grep "const fields|const schema|compose("` over `features/`) shows **10 of the 16 schema-owning controllers build the schema as a MODULE-LEVEL CONST**, evaluated at import time, not in a closure:

```
import-purpose/controller.js:35            const fields = compose(
contact/controller.js:12                   const fields = compose(
transport/transporters-select.js:12        const fields = compose(
transport/transporters.controller.js:12    const fields = compose(
transport/private-transporter-details.js:34 const fields = compose(
import-type-filter/controller.js:25        const fields = compose(
import-reason/controller.js:24             const fields = compose(
documents/controller.js:40                 const fields = compose(
cph-number/controller.js:19                const fields = compose(
declaration/controller.js:16               const fields = compose(
```

Only 4 are functions (`origin:26`, `port-of-entry:44`, `create-address:36`, `consignment-details:23 fieldsFor`) and 2 are built inline (`animal-identification:135,142`, `additional-details:73`).

This is not a pedantic distinction. A **closure** implies the rule is constructed per-request and structurally unreachable. A **module-private const** is a static, self-describing value one `export` keyword away from being enumerable — and Joi schemas are self-describing: `schema.describe()` returns keys with their `max` rules, `pattern`s and `valids`. The barrier is a missing export, not a shape.

And the join already exists. Every A controller **already exports** `meta.collects` (obligation ids — `shared/kit.js:27 collectsFrom`), and A's convention is field-name === obligation-id: `features/origin/obligations.js` declares `countryOfOrigin`, `regionOfOriginCodeRequirement`, `regionOfOriginCode`, `internalReferenceNumber`, and those are byte-for-byte the four Joi keys in `origin/controller.js:26-49`. `contract.test.js` already enumerates all 22 pages by importing every controller module and cross-checking `meta.collects` against `registry.all`. Add `schema: fields` to each controller's `meta` and the same test file gets an obligation → rules index for free. **That is a ~20-line tool, not a rewrite.** The claim's phrasing implies a structural impossibility; the source shows a missing export.

## 3. REFUTED — "every rule exists only as an argument to a Joi factory"

Not every rule is Joi at all, so even a perfect Joi-schema introspector would miss rules:

- `transport/transit-countries.controller.js:28-38` — membership + max-12, hand-coded against the countries service; does not import `lib/validate`.
- `commodities/search.controller.js:127` — `errors: { search: 'Select a commodity' }`, hardcoded.
- `commodities/consignment-details.controller.js:126-145` — the count-drop cross-collection rule, plain JS.
- `commodities/animal-identification.controller.js:481-486` — the at-least-one-identifier save block, plain JS.
- `commodities/animal-identification.controller.js:218-225` — `ADDRESS_MANDATORY_MESSAGES`, a hand-written constant map.

This cuts *against* A — its non-enumerability is worse than the claim says — but the claim's stated mechanism ("it's all Joi factory arguments") is wrong, and a retrofit that only exports the Joi schemas would leave 5 rule sites still invisible.

## 4. REFUTED — the gate attribution ("coverage/whitelist/i18n gates")

Only **one** of the three named gates rests on the domain Map.

- **coverage** — TRUE. `obligations/coverage.test.js:83` — `obligations.filter((o) => !domain.has(o.id) && !KNOWN_UNWIRED.has(o.name))`. This genuinely requires the Map. Real, and A has no equivalent.
- **whitelist** — FALSE. `obligations/whitelists.test.js` imports only `./evaluator.js` and `./obligations.js` (lines 20-39). It **never imports `domain`**. It rests on the obligations manifest's `applyTo`/allow-list metadata, which is a different mechanism entirely.
- **i18n, at the exact lines cited (`i18n-coverage.test.js:78-87`)** — FALSE. Those lines are `collectFlowKeys(node)`, which walks `flow.sections` for `entry.errors.required`. That is the **flow** layer, not the domain Map. The Map contributes only label keys (`:105 collectDomainLabelKeys`) and address sub-field keys (`:117`). There is **no gate asserting that every reason code a domain entry can emit has a COPY key** — the `FORMAT_ERROR_KEYS` check (`:190-202`) is a separate, hand-maintained key list.

`grep -rn "domain.values()|domain.entries()"` over B's entire tree returns exactly two hits (`i18n-coverage.test.js:105` and `:117`). Plus `domain.has()` in coverage. That is the whole of B's registry introspection today.

## 5. AMENDED — "assert every obligation with a max length enforces it"

B cannot do this from data either, for the majority of cases.

`predicate()` (`domain/index.js:163-167`) attaches `metadata = { shape: 'predicate', reasons: reasons.map(r => r.code) }`. The **max value is captured inside the closure** — `stringMaxLength(58, passport)` at `:288-304` closes over `58` and exposes it nowhere. So for the 12 scalar `stringMaxLength(n)` entries you can ask "does this obligation have a max-length rule?" (via `metadata.reasons` containing `domain.string.maxLength`) but **not** "what is its max?". Only `addressBlock` (`metadata.subFieldRules`, `:269-279`) and `transitedCountriesDomain` (`metadata.max: 12`, `:1104`) expose the number as data.

What B *can* do and A genuinely cannot: iterate the 40 entries, and for each one that declares `reasons.stringMaxLength`, **execute** its predicate against an over-long string and assert it fires. That is a real, enumerable property test — and it is impossible on A, where the schema is unreachable and 5 rules aren't Joi. But **B has not written it.** The claim credits B with a capability its code makes possible and its tests do not exercise.

## 6. Structural or not?

Not structural on either side.

- A's purity guard (`obligation-purity.test.js:37-48`) rejects an obligation importing `joi` or `lib/validate/index.js` — it bans **imports**, not **keys**. An obligation could carry `maxLength: 58, pattern: '^[a-zA-Z0-9]*$'` as plain data with no import and the guard would pass. A's own `spec/journey-spec.json:626-632` already holds exactly that for 39 fields (13 `maxLength`) — and `grep -rn "journey-spec"` confirms **no `.js` file loads it**; the only hits are `PROVENANCE.md` and docs. A has the data and does not load it.
- So the exclusion is a **deliberate design axiom** (`docs/obligation-model.md:37-41`), not a structural limit. VE-1 says "are not enumerable" (present tense, true) but the surrounding argument reads as "cannot be", which the source does not support.

---

## Amended claim (the strongest version that IS true)

A's value-validation rules are not addressable today: nothing exports a schema (grep for exported `fields`/`schema`/`validators` returns zero), so no test or tool can ask "what rules apply to obligation X". But this is a missing `export`, not a structural limit — 10 of the 16 schema-owning controllers hold their schema as a module-level `const fields = compose(...)`, Joi schemas are self-describing via `.describe()`, every controller already exports `meta.collects`, and field-name === obligation-id, so an obligation → rules index is a ~20-line join on machinery `contract.test.js` already has. The genuinely irreducible part is that **5 rule sites are not Joi at all** (`transit-countries:28-38`, `search:127`, the count-drop at `consignment-details:126-145`, the at-least-one-identifier block at `animal-identification:481-486`, `ADDRESS_MANDATORY_MESSAGES` at `animal-identification:218-225`), so even a perfect Joi introspector under-reports; and A's obligation model deliberately carries no validation data at all (`docs/obligation-model.md:37-41`), despite `spec/journey-spec.json` holding `maxLength`/`pattern` for 39 fields that no runtime `.js` ever loads.

B's 40-entry `Map` keyed by obligation id (`domain/index.js:1150-1194`) is real and buys **one** gate the claim names — `coverage.test.js:83` (`!domain.has(o.id)`), which A structurally has no equivalent of. The other two attributions are wrong: `whitelists.test.js` never imports `domain`, and the cited `i18n-coverage.test.js:78-87` is a walk of `flow.sections`, not the Map (the Map contributes only option labels at `:105` and address sub-field keys at `:117`). B's rule *values* are also not data for the 12 scalar cases — `predicate()`'s metadata carries only `{shape, reasons}` and `stringMaxLength(58, …)` hides the 58 in a closure — so "assert every obligation with a max length enforces it" is not achievable from B's data either. What B *can* do, and A cannot, is enumerate the 40 entries and **execute** each declared reason code as a property test. B has not written that test.

The real asymmetry is therefore narrower and cheaper than VE-1 states: **B's registry makes rule presence enumerable and A's does not, but neither side makes rule content enumerable, and A's route to presence-enumerability is an export keyword plus 5 non-Joi rules to fold in — not a rewrite.**
