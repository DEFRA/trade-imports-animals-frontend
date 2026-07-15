# L3 adversarial verification — VE-6 (validation-errors)

**CLAIM:** "A's rule vocabulary is liftable to data and B's is not, ever — and A
already holds the declarative validation data it does not load. … B's
applyTo/predicate ARE closure bodies: they cannot be serialised, cannot come out
of a spreadsheet or a spec generator, and cannot be diffed by a policy author —
`.metadata` is a description of the closure, not the closure."

**VERDICT: REFUTED.** The central assertion — the *asymmetry* — does not survive
contact with either tree. B's gate vocabulary is built by data-taking combinators
whose `.metadata` is **lossless** (the closure is mechanically reconstructible from
it), B already **loads and executes** a declarative validation rule-table for the
largest input population in the journey, and A's runtime obligation record carries
**zero** validation vocabulary at all. The one artefact the claim rests on —
`spec/journey-spec.json` — is not a serialisation of A's model, it is an unloaded
upstream requirements digest that **has already drifted from the code**.

---

## 1. What I verified of the quotes (all real, one mis-read)

| Cited | Real? | Means what the claim says? |
|---|---|---|
| A `spec/journey-spec.json:626-632` — `input{widget,maxLength:58,pattern:^[a-zA-Z0-9]*$,hint,example}` | YES, verbatim | Yes |
| A `features/origin/controller.js:34-48` — `maxText(…,58,…)` + `pattern(…,/^[a-zA-Z0-9]*$/,…)` | YES, verbatim | Yes — hand-typed re-statement. (Pedantic: it is A's own `lib/validate` wrapper over Joi, not raw Joi.) |
| "no runtime `.js` imports journey-spec.json" | **YES — confirmed independently.** `grep -rln journey-spec` over the whole of A returns exactly one file: `PROVENANCE.md`. No source, no test. | Yes |
| B `obligations/obligations.js:10-15` — "(closure + `.metadata`)" | **The lines are real but they are a DOC COMMENT that says the OPPOSITE.** | **NO** |
| B `domain/index.js:163-167` — `predicate()` metadata carries only reason codes | YES, verbatim | Yes, *for that one shape* (~4 of ~40 entries) |

The claim's own citation for B is self-defeating. `obligations.js:9-16` reads:

> "Common gate shapes are provided as pure helper functions in `helpers.js` —
> `allowListed`, `allowListedByPredicate`, `branchedGate`, `anyAllowListed` — **that
> build applyTo functions with metadata attached for optional introspection**."

And `helpers.js:16-19` states the design intent outright:

> "Each returned function has a `.metadata` property **describing the gate
> declaratively. Enables optional static introspection / cross-language export**
> without giving up the imperative-JS surface."

## 2. B's `.metadata` IS the closure, for most of the model

`helpers.js:39-57` (`allowListed`), `:101-120` (`anyAllowListed`), `:147-154`
(`matches`) attach `{type, obligation, values, projection, reasons}`. Every
argument the combinator took is in the metadata. `allowListed(byId(m.obligation),
m.values, byId(m.projection), m.reasons)` rebuilds the identical closure. That is
**data + interpreter** — structurally the *same* arrangement as A's
`activatedBy:{obligation,equals}` + `applyPredicate`. The helper library IS B's
interpreter; the metadata IS B's data.

Census of B's **39** `applyTo` entries (`grep -n "applyTo:" obligations.js`):

| Shape | Count | Liftable to data *today*? |
|---|---|---|
| `() => ({inScope:true, status:'mandatory'\|'optional'})` constant | 19 | Yes — trivially (`{always:'mandatory'}`) |
| `allowListed` / `anyAllowListed` (pure-data combinator) | 8 | Yes — metadata lossless |
| `branchedGate(pred, …)` | 5 | metadata omits the predicate — lossy |
| `allowListedByPredicate` | 2 | metadata exposes the fn — opaque body |
| shared `accompanyingDocumentBlockApplyTo` (a `branchedGate`) | 4 | lossy |

**27 of 39 are already fully liftable.** And the 12 that are not are the killer,
because I read every one of their predicate bodies:

- `fulfilments[regionCodeRequirement.id] === 'yes'` (`:194`) → **`equals`**
- `fulfilments[reasonForImport.id] === 'internal-market'` (`:217`) → **`equals`**
- `fulfilments[transporterType.id] === 'commercial'` (`:283`) → **`equals`**
- `fulfilments[transporterType.id] === 'private'` (`:297`) → **`equals`**
- `LAND_TRANSPORT_MODES.includes(fulfilments[meansOfTransport.id])` (`:338-339`) → **`includes`**
- `noSpecificIdentifier` = not in (PASSPORT ∪ TATTOO ∪ EAR_TAG ∪ HORSE_NAME) (`:674-678`) → **`notInUnionOf`**
- `documentTypePresent` = `isFilled(fulfilments[accompanyingDocumentType.id])` (`:751-752`) → **`present`**

Seven for seven, those are **exactly A's four operators** —
`equals` / `includes` / `notInUnionOf` / `present` — the complete vocabulary of
`engine/evaluate/predicate.js:12-29`. A's `notInUnionOf` operator exists *for this
very rule*. So the entire scope-gate rule set of B is expressible in A's own DSL:
there is no rule B wrote as a closure that A's data model could not hold.

Worse for the claim: **B already ships the combinators that would make those sites
lossless and simply did not use them there** — `matches(obligation, value)`
(`helpers.js:147-154`) and `present(obligation)` (`:165-175`) sit in the library,
unused at the five `branchedGate` call sites. That is a *not-built*, not a
*cannot-build* — method failure-mode #3, precisely.

## 3. B holds declarative validation data **and loads it**; A does not

The claim's rhetorical high point ("A already holds the declarative validation data
it does not load") is true, and irrelevant, because B holds it *and runs it*.

- `domain/index.js:861-871` — `ADDRESS_SUB_FIELD_RULES` is a pure JSON-shaped table:
  `{name:{type:'string',maxLength:255}, town:{…,maxLength:100}, postcode:{…,12},
  country:{type:'enum',options:COUNTRY_OPTIONS}, telephone:{…,20}, email:{type:'email',maxLength:254}}`.
- `domain/index.js:197-215` — `addressBlock(obligation, {subFields, required, subFieldRules})`
  is a **generic interpreter**: its predicate loops `subFields`, looks up
  `subFieldRules[sub]`, and enforces `rule.maxLength` / `rule.type==='email'` /
  `rule.options` (`:227-255`). Nine `addressBlock` entries reference the one table.
  That is data-driven validation, in production, covering the biggest input
  population in the journey.
- `domain/index.js:134-142` — `staticEnum(options, {labels})`: 12 entries whose
  options+labels are literal data with lossless `.metadata`.
- `domain/index.js:288-304` — `stringMaxLength(max, obligation)` is a
  **factory taking a number**. `stringMaxLength(58, passport)` is exactly as
  liftable as A's `maxText('internalReferenceNumber', 58, msg)`. 13 entries.

So of B's ~40 domain entries, **~34 are data or data-parameterised factories**.
The genuinely bespoke residue is ~4 (dates, integer ranges) — and A's counterparts
for those (`dateParts`, `integerInRange`, `currency`, `ukPhone` in
`lib/validate/validators.js:97-157`) are bespoke Joi `.custom()` closures too.

Meanwhile **A's runtime obligation record carries no validation vocabulary
whatsoever** — `features/origin/obligations.js:1-26` is
`{id, required, enforcedAt, activatedBy, wipeOnExit}`. There is no slot on A's
obligation to lift a maxLength *into*. A's runtime holds zero declarative
validation data. B's holds a lot.

## 4. "A is one loader away" is false — the spec has already drifted

Nothing imports `journey-spec.json` and no test pins it against the code, so it
has rotted, silently:

- **Value-domain drift.** Spec: `regionOfOriginCodeRequirement.input.values =
  ["Yes","No"]` (`:575`) and `regionOfOriginCode.activatedBy = {obligation:
  "regionOfOriginCodeRequirement", equals: "Yes"}` (`:600-603`). Code: the value
  domain is lowercase — `oneOf('regionOfOriginCodeRequirement', ['yes','no'])`
  (`features/origin/controller.js:33`) and the live gate is
  `activatedBy: {obligation: regionOfOriginCodeRequirement, equals: 'yes'}`
  (`features/origin/obligations.js:15`). **A loader that consumed the spec literally
  would build a gate that never fires.**
- **Mandate drift.** Spec gives `regionOfOriginCode` `mandate:{required:true,
  enforcedAt:"submit"}` while its own `mandateRaw` says "Mandatory to proceed"
  (`:594-598`); the code says `required: true` with no `enforcedAt`
  (`obligations.js:12-17`).
- **Coverage hole — the big one.** The address block's rules (9 sub-fields ×
  9 blocks: the bulk of A's field-level validation) are **not machine-readable in
  the spec at all**. They exist only as English prose inside a string:
  `fieldGroups.address.detail` = *"Name or Organisation name (string max 255,
  Mandatory); Address Line 1 (string max 255, Mandatory); …"* (`:194`). No loader
  can consume that. The spec's `fields` array (`:183-193`) is bare names.
  Total machine-readable validation in A's spec: **13 `maxLength` + 1 `pattern`.**
- **Consequence, live in A's code:** with no table to point at, A hand-types the
  identical 9-rule address block **twice** —
  `features/transport/private-transporter-details.controller.js:34-59` and
  `features/addresses/create-address.controller.js:36-71` (255/255/100/100/12/20/254
  + country enum, duplicated verbatim). B has one `ADDRESS_SUB_FIELD_RULES`,
  referenced nine times. The "code, not data" pathology the claim attributes to B is
  observably happening in **A**, in the validation dimension, right now.

## 5. The last defence, closed

One could argue B's combinators take *obligation objects* (`allowListed(commodityCode,
…)`), so they cannot round-trip through JSON. But A's do too:
`activatedBy: {obligation: regionOfOriginCodeRequirement, …}`
(`features/origin/obligations.js:15`) is an **object reference, not an id string** —
while the spec uses `"obligation": "regionOfOriginCodeRequirement"`. Both sides need
precisely the same name→object resolve step at load. Perfectly symmetric.

---

## 6. The salvageable residue

Something true is buried in VE-6, and it is much smaller than the claim:

> Neither side loads its validation rules from data today. B is closer: 27 of 39
> scope gates already carry lossless metadata, and value legality is already
> data-driven (`ADDRESS_SUB_FIELD_RULES` + `staticEnum`) for the majority of rendered
> inputs, with 13 more as `stringMaxLength(n)` factory calls. A's runtime obligation
> has no validation slot at all, and the `journey-spec.json` that holds its rules is
> unloaded, untested, drifted (`"Yes"` vs `'yes'`), and expresses the address block —
> the bulk of the rules — as English prose, not data. The genuine residue of
> opacity on B is ~11 sites: 5 `branchedGate` predicates (metadata drops the
> predicate) and 2 `allowListedByPredicate` + 4 shared doc-block gates. Every one of
> those predicates is an `equals` / `includes` / `notInUnionOf` / `present` shape —
> i.e. inside A's own four-operator vocabulary — and B already ships the `matches()`
> and `present()` combinators that would close them. Closing that residue is a
> ~half-day of re-expression on B. Getting A to the same place requires inventing a
> validation slot on the obligation, machine-reading the address prose, and building
> a drift gate the spec has already failed.

**Direction of the finding is therefore INVERTED relative to the claim.** Liftability
is not A's asymmetric win; on the evidence it is closer to B's.

### Shopping-list impact
- Strike "A's data-shaped rule vocabulary (JSON-liftable, spec-generatable)" from
  the list of A's wins (L2 §2.1, item 5). A's *scope* DSL is liftable; A's
  *validation* is not, and A's spec is not a model serialisation.
- Keep: the four-operator DSL as the **target vocabulary** — it demonstrably covers
  100% of B's hand-written gates. The third option should express B's gates in it.
- Add: **B's `ADDRESS_SUB_FIELD_RULES` + `addressBlock` interpreter** is a steal for
  A (kills A's duplicated 18 hand-typed address rules outright), and generalising
  that table shape to scalars kills B's 13 `stringMaxLength` predicates. Same fix,
  both sides, one table.
- Add: whatever the third option does, **a test pinning the spec to the code** is
  non-negotiable. A's spec proves what an unpinned spec becomes.
