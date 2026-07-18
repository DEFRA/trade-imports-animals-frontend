# Design deltas — where the vendored model (B) diverges from its source

The vendored obligation model under `model/` is a copy of Paul's blended
model (**B**) from `spike/EUDPA-288-blend-obligations-models` @ `34550a3`
(see `PROVENANCE.md`). Every point where this copy intentionally differs
from that source is recorded here.

---

## 1. `pathPrefix` depth fix — `obligations/helpers.js` · `EUDPA-288` inc-006

**What changed.** `filterAndProject` no longer slices a projection path at
its first slash to match it against the gate's passing keys. The old form
matched a single leading segment via a `pathPrefix(path)` helper:

```js
// before (B @ 34550a3)
passingKeys.includes(pathPrefix(path)) // pathPrefix = path.slice(0, firstSlash)
```

```js
// after
passingKeys.some(
  (key) => key === '' || path === key || path.startsWith(`${key}/`)
)
```

The `pathPrefix` helper is deleted (it had no other caller).

**Why.** The first-slash slice can only ever match a gate whose stored keys
are **one segment long** — i.e. a gate `within` a depth-1 group. A gate that
itself sits inside a depth-≥2 group and projects deeper matches nothing:
its `applyTo` reports `inScope: false`, and `purgeStorage`'s derived-leaf
branch then **deletes the user's stored records**. Silent data loss.

The trigger is a **gate within a depth-≥2 group that projects deeper** — not
"the journey is depth-3". Any per-unit-gated projecting obligation arms it.
In A's current journey no such gate exists, so the bug is latent-not-live
here — but it is a data-destroying trap and is fixed regardless.

**Proven, not guessed.** inc-003 reproduced both halves by execution against
B @ `34550a3`: red as shipped (a depth-2 gate's admitted leaf came back
`undefined` — the stored value destroyed), green with exactly this fix, no
other change. The regression pin is `retrofit/path-prefix-depth.test.js`
(un-skipped at inc-006), including a negative control so the fix cannot be
bought by admitting everything.

**Backwards compatibility.** Scalar gates (key `''`) and depth-1 gates
(key `line1`, path `line1/unit1` → `line1/…` prefix) are unchanged — the
`key === ''` and `path.startsWith(`${key}/`)` branches reproduce the old
behaviour for exactly those cases. The `key === ''` branch is load-bearing:
`filterAndProject` uses `''` as the key for a scalar (non-record-map) gate,
and the naive `startsWith(key + '/')` alone would regress it. All ~505
vendored B tests stay green; only the previously-skipped depth test flips
from skipped to passing.

**Upstream.** This bug is **live-latent on Paul's branch too**
(`spike/EUDPA-288-blend-obligations-models`) — same `helpers.js`. It is
harmless there only because no manifest currently arms it, but it is a
genuine data-destroying defect. **Recommend reporting it upstream to Paul**
so his branch carries the fix (or at least the regression test) rather than
shipping the trap. Low urgency (latent), but it is the kind of bug that
bites the moment someone adds a per-unit gate.

---

## 2. `is-blank-value` relocated `lib/` → `engine/` · `EUDPA-288` inc-006

**What changed.** `is-blank-value.js` (+ its test) moved from
`model/lib/` to `model/engine/`, co-located with its sole consumer
`engine/index.js`; the import there changed `../lib/is-blank-value.js` →
`./is-blank-value.js`. Pure relocation — the function body is untouched.

**Why.** In B the file sat under `lib/` alongside now-discarded
presentation helpers (`field-widgets.js`, `presentation.js`), shared by
`contract.js`/CYA/engine. In the vendored subtree those consumers were
not lifted, so `engine/index.js` is the only importer. `lib/` otherwise
holds only the test-only `i18n.js`. Homing the file with its consumer is
tidier and removes a vestigial cross-directory hop.

**Backwards compatibility.** Behaviour-neutral; the vendored
`is-blank-value.test.js` (kept, moved alongside) stays green.

---

## 3. Obligation `name` retrofitted to A's obligation id · `obligations/obligations.js` · `EUDPA-288` inc-007

**What changed.** Every `kind: "rename"` obligation in
`retrofit/mapping.json` had its `name:` string value changed from B's
original name to the mapping's `aId`. 13 renames:

| B name (source `34550a3`) | new `name` = A's obligation id          |
| ------------------------- | --------------------------------------- |
| `regionCodeRequirement`   | `regionOfOriginCodeRequirement`         |
| `regionCode`              | `regionOfOriginCode`                    |
| `commodityLine`           | `commodityLines`                        |
| `commodityCode`           | `commoditySelection`                    |
| `species`                 | `speciesSelection`                      |
| `numberOfAnimals`         | `numberOfAnimalsQuantity`               |
| `cph`                     | `countyParishHoldingCph`                |
| `unitRecord`              | `animalIdentifiers`                     |
| `passport`                | `animalIdentifierPassport`              |
| `tattoo`                  | `animalIdentifierTattoo`                |
| `earTag`                  | `animalIdentifierEarTag`                |
| `identificationDetails`   | `animalIdentifierIdentificationDetails` |
| `description`             | `animalIdentifierDescription`           |

The 28 `exact` entries already satisfy `name === aId` and were left
untouched; `a-only` / `b-only` entries are not renames.

**Why.** The bridge (inc-008/009) resolves B's implication for A's
obligation by matching `B.name === A.id`. The `name` is the bridge key;
making it equal the A id is what this increment is for.

**What did NOT change.**

- **The uuid `id:` is the durable key and is untouched** on every
  obligation. Nothing keyed by id moved — `domain/index.js`'s rule map
  (`[obligation.id, …]`) and every gate's `.metadata.obligation`
  (`gateObligation.id`) are uuid-keyed, so gate resolution and domain
  wiring are unaffected.
- **The JS export bindings are untouched** (`export const commodityCode`
  still binds `commodityCode`; only its `.name` value is now
  `commoditySelection`). Renaming the bindings would touch every
  importer and test for zero bridge benefit; the minimal correct change
  is the `name:` value alone.

**Deliberate divergence from B.** This is a retrofit divergence from B's
`34550a3` naming — B's manifest keeps the original names; this vendored
copy renames them onto A's ids so the bridge can look B up by A's id.

**Backwards compatibility / tests.** Two vendored tests keyed off the
old `name` strings and were updated to the new truth:
`obligations/coverage.test.js` (KNOWN_UNWIRED structural-group names
`commodityLines` / `animalIdentifiers`) and
`analysis/reachability.test.js` (name-string manifest look-ups for
`regionOfOriginCode` / `countyParishHoldingCph` /
`regionOfOriginCodeRequirement` and the synthesisable-name assertions).
`retrofit/mapping.test.js`'s B side was strengthened from snapshot-only
to a live cross-check against the vendored manifest (every bId resolves;
`vendored.name === aId` for exact + rename). `whitelists.test.js`,
`evaluator.test.js` and `domain/index.test.js` use bindings / `.id` /
the obligation's own `.name`, so they needed no change.

---

## 4. `domain.labels` stripped — display copy leaves the model · `domain/index.js` · `EUDPA-288` inc-007a

**What changed.** Every human-readable option-copy sidecar was removed from
the domain layer, per Sam's ruling (2026-07-17, PLAN §5.4): _"No display
logic in the model. Titles, labels, titleKey-in-JSON — all of it goes.
Display lives in the .njk. Use the most realistic source — we have MDM,
use it."_

- The `staticEnum` / `computedEnum` factories no longer accept or attach a
  `labels` sidecar, and no longer carry `labels` on their `.metadata`. Their
  signatures dropped the trailing `{ labels }` options bag.
- All **15** domain entries that passed `labels` were de-labelled:
  `reasonForImport`, `purposeInInternalMarket`, `transporterType`,
  `meansOfTransport`, `countryOfOrigin`, `commodityCode`, `commodityType`,
  `portOfEntry`, `species`, `containsUnweanedAnimals`,
  `regionCodeRequirement`, `transitedCountries`, `animalsCertifiedFor`,
  `accompanyingDocumentType`, `accompanyingDocumentAttachmentType`.
- `transitedCountriesDomain` (a hand-rolled enum-plus-predicate object) lost
  its top-level `labels` and its `metadata.labels`.
- The address-block `country` sub-field rule dropped `labels: COUNTRY_LABELS`
  — the predicate only reads `options`/`type`/`maxLength`, so the label map
  was dead display copy there too.
- **4** now-orphaned `*_LABELS` constants were deleted (verified unreferenced
  before removal): `YES_NO_LABELS`, `SPECIES_LABELS`, `COUNTRY_LABELS`, and
  the exported `ANIMALS_CERTIFIED_FOR_LABELS` (no importers anywhere under
  `model/`).

**What survives — value legality, not copy.** `options` (the code lists),
predicates, types, `addressBlock`'s `subFieldRules` + `isComplete`, and all
`reasons` codes stay. Those answer "is this a legal value?", which is model.

**i18n vendoring removed as a test-only orphan.** inc-005 vendored
`model/lib/i18n.js` + `model/locales/en.json` **solely** to keep the domain
test's `t(label)` assertions green. After the ~4 label `it()` blocks were
removed from `domain/index.test.js`, a tree-wide grep confirmed the test was
the **only** importer of `i18n.js`, and `i18n.js` the only reader of
`en.json`. Both files (and the now-empty `lib/` and `locales/` dirs) were
deleted. No production code imported either.

**Copy now lives where the ruling puts it.** Static field copy → A's `.njk`
templates (as A already does today). Coded-field copy → A's MDM services,
wired at inc-007c (`computedEnum`'s signature already fits a
service-delegated `options` source). This increment removes copy only; it
does not change where option _values_ come from.

**Deliberate divergence from B.** B's `34550a3` domain holds i18n key strings
as `labels` sidecars on its enum entries. This vendored copy strips them —
a retrofit divergence enforcing the no-display-logic-in-the-model rule.

**For inc-007b (purity key-assert):** the `domain/` tree is now clean of
display keys. A tree-wide grep for `labels|titleKey|title:|hint:|legend:`
returns only comment prose and unrelated AST-operator name constants
(`OPERATOR_LABELS`, `.metadata.type` helper-type "labels" in `analysis/`) —
no display copy in code. The key-level assert can be added against a green
tree.

**For inc-007c (MDM options):** `staticEnum`/`computedEnum` no longer carry
any copy, so delegating `options` to A's services is now purely a value-source
change with no label entanglement to unpick.

**Backwards compatibility / tests.** `domain/index.test.js` lost the 4 label
assertions (the `t()`/`.labels` tests) and its `i18n.js` import; every
assertion about `options` / predicates / metadata `shape`+`readsFrom` /
`isComplete` was preserved unchanged. Full model suite green: 74 test files
passed, 1095 tests passed (baseline 1099 − 4 label its), 11 skipped
unchanged.

---

## 5. Key-level display-key purity gate · `model/no-display-keys.js` · `EUDPA-288` inc-007b

**What changed.** A new pure checker + vitest gate polices Sam's ruling (PLAN
§5.4) at the KEY level: no obligation or domain entry may carry a display key.
Banned keys: **`label`, `title`, `titleKey`, `hint`, `legend`, `widget`**
(`DISPLAY_KEYS`, extend if a new display-ish key appears in B). inc-007a
stripped `domain.labels`; this turns "keep it stripped" from a convention into
a gate.

- `model/no-display-keys.js` — `findDisplayKeyOffenders(obligations, domain)`
  (returns offending paths, pure) and `assertNoDisplayKeys(obligations,
domain)` (throws). Argument-driven, imports nothing from the model, so the
  same code runs as a test now and as boot-time enforcement at M3.
- `model/no-display-keys.test.js` — asserts the real vendored `obligations`
  array + `domain` map are clean, plus a **positive control**: labelled
  fixture objects (a top-level `label`, and display keys nested in
  `metadata` / `item[]` / `subFieldRules`, on a domain entry, and on an
  `applyTo.metadata` gate decision) that the checker must catch. If the walk
  were a no-op the positive control fails — so a green suite proves the check
  bites, not merely that the model happens to be clean.

**Object-scoped, not a source grep — the load-bearing design choice.**
REPORT:460-465 refutes `obligation-purity.js`'s import-specifier regex as a
structural guarantee: it "never inspects a key". A naive source grep for
`label` is the opposite failure — inc-007a's handoff warned that `analysis/`'s
`OPERATOR_LABELS` / helper-type `"labels"` constants NAME AST operators and
would false-positive. This checker walks the LIVE obligation + domain object
graphs it is handed (recursing plain objects, arrays, Maps, and the
`.metadata` sidecars hung off `applyTo` closures; `WeakSet`-guarded against
the cyclic `within` back-references), so the `analysis/` constants are
structurally unreachable and cannot false-positive, while a `titleKey:` added
directly to an obligation would be caught where the regex could not.

**Scope.** Polices the vendored `model/` only (the model being adopted). Not
pointed at A's `features/*/obligations.js` — those are clean today and retire
at M4 anyway.

**Wire into `obligation-purity.js` at M3.** A comment note in
`obligation-purity.js` points M3 at `assertNoDisplayKeys`. It is NOT wired to
boot yet — the model is dark (not booted, not imported by A's `routes.js`), so
the check lands now as a CI test over the vendored model and lifts into the
boot-time assert when the model goes live at M3. A's existing import-specifier
assert is untouched and still runs.

**Backwards compatibility / tests.** Purely additive — one new source file +
one new test file, no existing model file changed. Model suite: 74 → 75 test
files, 1095 → 1103 tests passed (+8 from the new gate), 11 skipped unchanged.

---

## 6. MDM-backed `options` delegated to A's services · `domain/index.js` · `EUDPA-288` inc-007c

**What changed.** Every domain enum entry with an MDM source no longer
declares a hardcoded static option list. Its `options` closure now calls the
SAME reference-data service accessor A's own controllers use, returning
**codes only** (no display copy). Per Sam's PLAN §5.4 ruling: "use the most
realistic source at any given point — we have the MDM integrations, use
them." This is a divergence from B (`34550a3`), whose domain declared static
`staticEnum` lists.

**This deliberately opens B's closed import set.** `domain/index.js` now
imports seven `services/<name>/index.js` modules. That is the intended MDM
trade, not a regression — `obligation-purity.js` already sanctions the
`services/<name>/index.js` route, and the no-display-keys gate (§5) stays
green, proving values were delegated without reintroducing copy.

**Field ↔ service delegation map.**

| Domain entry                         | Service accessor (A's own source)                 | Status         | Value vocabulary                            |
| ------------------------------------ | ------------------------------------------------- | -------------- | ------------------------------------------- |
| `reasonForImport`                    | `import-reason-purpose.reasons()`                 | delegated-live | camelCase (`internalMarket`, …)             |
| `purposeInInternalMarket`            | `import-reason-purpose.purposes()` (reason-gated) | delegated-live | kebab; gate value now `internalMarket`      |
| `countryOfOrigin`                    | `countries.originCountries()`                     | delegated-live | ISO codes, GB-excluded                      |
| `transitedCountries`                 | `countries.originCountries()`                     | delegated-live | ISO codes; max-12 predicate kept            |
| `portOfEntry`                        | `ports.list()`                                    | delegated-live | port codes (`GB DVR`, …)                    |
| `meansOfTransport`                   | `transport-reference.meansOfTransport()`          | delegated-live | Title Case (`Airplane`, …)                  |
| `transporterType`                    | `transport-reference.transporterTypes()`          | delegated-live | `Commercial` / `Private`                    |
| `commodityCode`                      | `commodities.list()`                              | delegated-live | commodity NAMES (`Cow`, …), NOT CN codes    |
| `species`                            | `commodities.speciesFor(line's commodity)`        | delegated-live | taxonomy ids; per-line, reads commodityCode |
| `animalsCertifiedFor`                | `certification-purposes.certificationPurposes()`  | delegated-live | kebab (A's spelling)                        |
| `accompanyingDocumentType`           | `document-types.documentTypes()`                  | delegated-live | display strings (A has no code/label split) |
| `accompanyingDocumentAttachmentType` | `document-types.attachmentTypes()`                | delegated-live | `PDF` / `DOC` / …                           |
| `containsUnweanedAnimals`            | —                                                 | left static    | yes/no                                      |
| `regionCodeRequirement`              | —                                                 | left static    | yes/no                                      |
| `commodityType`                      | —                                                 | left static    | B-only placeholder set; A has no service    |

Address-block `country` sub-field validation is out of scope (a sub-field
rule, not a top-level enum entry; A renders it from
`countries.addressCountries()`). Its static `COUNTRY_OPTIONS` list stays.

**All twelve MDM entries are delegated LIVE — nothing seamed for M3.** The
escape hatch was not needed: A's services expose synchronous stub data at
import time (`countries`/`ports` are pre-primed from their stub; the other
five have no `prime()` at all), so in the dark model test context every
accessor returns real data without boot priming. No module-boundary mocking
was introduced and no assertion was weakened — the domain tests were updated
to the new MDM truth (values, and `metadata.shape` `staticEnum` →
`computedEnum` for the delegated entries).

**Factory.** Delegation uses `computedEnum(fn)` (PLAN §5.4 — "computedEnum's
signature already fits"). Entries that read no sibling obligation pass
`readsFrom = []` (they read the service, not a sibling); `purposeInInternalMarket`
and `species` keep their sibling `readsFrom` (`reasonForImport`,
`commodityCode`). `transitedCountries` keeps its hand-rolled object shape
(options + max-12 predicate); only its `options` and `metadata` changed.

**Consequence for M2 — the option source now differs from B's gate
vocabulary.** The gates in `model/obligations/obligations.js` still compare
B's codes, but the stored value domain now follows A's MDM vocabulary. The
sharpest cases the oracle (inc-010) and bridge (inc-008/009) must normalise:

- **`commodityCode`** — options are NAMES (`Cow`), gates compare CN codes
  (`0102`). Normalise A→B via `COMMODITY_CODES`, which is **non-injective**
  (`Cat`/`Dog` → `01061900`), so only A→B is safe (PLAN §5.6).
- **`reasonForImport`** — camelCase (`internalMarket`) vs B's kebab
  (`internal-market`). `purposeInInternalMarket`'s reason gate was moved to
  the camelCase value to stay self-consistent.
- **`meansOfTransport` / `transporterType`** — Title Case vs B's kebab.
- **`portOfEntry`** — `GB DVR` (GB-prefixed) vs B's bare `DVR`.
- **`species`** — taxonomy ids vs B's species-name codes.
- **`accompanyingDocumentType`** — display strings vs B's kebab codes.

**Backwards compatibility / tests.** No new source or test files; only
`domain/index.js` (source) and `domain/index.test.js` (assertions updated to
the MDM truth) changed. Model suite unchanged at 75 files / 1104 passed / 11
skipped.

---

## 7. The fulfilments bridge — A `answers` <-> B `fulfilments` · `model/bridge/fulfilments.js` · `EUDPA-288` inc-008

**What this is.** Two pure, storage-agnostic functions —
`answersToFulfilments(answers)` and its inverse `fulfilmentsToAnswers(fulfilments)`
— translating between A's nested answer POJO and B's flat fulfilments map.
Additive: one new source file + one new test file, nothing else touched.
Nothing is wired to A's runtime yet (inc-012+ do that); the bridge is dark like
the rest of M1.

**The B key is the UUID, not the name.** Verified against `evaluator.js`:
`dropUnknownFulfilments` / `buildObligationsById` key `fulfilments` by
`obligation.id` (the UUID). The inc-007 `name == aId` rename is the bridge's
_lookup_ key (A id -> obligation), but the emitted fulfilments map is keyed by
`obligation.id`. The bridge derives its whole structure from the vendored
manifest (name = A id, id = UUID, `within` chain = depth), not from a
re-parsed `mapping.json`.

**Storage-shape translation (A positional <-> B composite).** An obligation's
depth is its `within`-ancestor-group count:

| A shape                                                                           | B shape                                        | rule                                        |
| --------------------------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------- |
| `answers.countryOfOrigin` (depth 0)                                               | `fulfilments[uuid]` (scalar)                   | value stored directly                       |
| `answers.commodityLines[i].numberOfAnimalsQuantity` (depth 1)                     | `fulfilments[uuid] = { 'line<i>': v }`         | one composite segment per group             |
| `answers.commodityLines[i].animalIdentifiers[j].animalIdentifierEarTag` (depth 2) | `fulfilments[uuid] = { 'line<i>/unit<j>': v }` | `/`-joined, one segment per enclosing group |

The composite fulfilmentId is `line<i>` at the commodity-line level and
`line<i>/unit<j>` at the unit level — one segment per enclosing group,
`/`-delimited, matching what `evaluator.js` slices as a group instance-path
(`prefixLen = ancestorGroups.length + 1`). The prefix (`line`/`unit`, from
`GROUP_SEGMENT_PREFIXES`) is cosmetic; only the trailing integer carries the
positional index. **Group obligations (`commodityLines`, `animalIdentifiers`)
never get a fulfilment entry** — B infers their instances from descendant
records — so the bridge skips them A->B and rebuilds A's arrays from the leaf
records B->A. `fulfilmentsToAnswers` is defined over bridge-convention
fulfilmentIds; opaque orchestrator ULIDs carry no positional index and are out
of scope for B->A (the inverse is over A-originated data).

**Vocabulary normalisation map (A stores A-vocab; B's gates compare B-vocab).**
Per-field, applied only to string scalars (addresses / dates / arrays are
opaque composite values that pass through). Fields not listed pass through:

| A field (aId)        | A vocab                      | B vocab                   | A->B               | B->A                       |
| -------------------- | ---------------------------- | ------------------------- | ------------------ | -------------------------- |
| `commoditySelection` | name (`Cow`)                 | CN code (`0102`)          | `commodityCodeFor` | `commodityNameFor` (lossy) |
| `reasonForImport`    | camelCase (`internalMarket`) | kebab (`internal-market`) | camel->kebab       | kebab->camel               |
| `transporterType`    | Title (`Commercial`)         | kebab (`commercial`)      | title->kebab       | kebab->title               |
| `meansOfTransport`   | Title (`Road Vehicle`)       | kebab (`road-vehicle`)    | title->kebab       | kebab->title               |
| `portOfEntry`        | GB-prefixed (`GB ABD`)       | bare (`ABD`)              | strip `GB `        | add `GB `                  |

The commodity converters are A's own `services/commodities` accessors. A
converter that cannot place a value (unknown name/code) passes the original
through rather than emit `undefined`, so an unrecognised value is never
destroyed.

**The non-injective commodity decision (option (a) — round-trip guaranteed
A->B->(subset)).** `COMMODITY_CODES` maps both `Cat` and `Dog` to `01061900`,
so `commodityNameFor('01061900')` recovers only the representative name (`Cat`,
the first key). `answersToFulfilments` (A->B, the evaluate path) is fully
correct — a cats-or-dogs consignment always produces the right CN code and the
right gate decisions. `fulfilmentsToAnswers` (B->A) recovers `Cat` for both.
This is **honest, deterministic loss, never a silent pass**: the CN code (the
wire-durable value on the notification) is preserved exactly; only A's UX name
`Dog` degrades to `Cat` on rehydration. Tested explicitly as a named
known-limitation case (`Dog round-trips to Cat`), alongside a positive
round-trip for the injective names (`Cow`/`Horse`/`Fish`/`Cat`).

**Documents topology (D1 — the biggest structural divergence).** A models
accompanying documents as a repeatable `documents` collection; B models the
four `accompanyingDocument*` fields as notification-level singletons. Handled
by a dedicated documents bridge in both directions, outside the generic walk:
A's `documents[0]` maps to the four B singletons; **`documents[1]` and later
are dropped (B's one-document cap)** and A's `filename` upload metadata is
dropped (no B obligation — PLAN §2.4, B stores a file-extension select, no
bytes). B->A reconstructs a single-element `documents` array.

**A→B mappings with no clean answer (inc-009 / inc-010 blockers).**

- **`species`** — A stores taxonomy ids; DESIGN-DELTA §6 names B's vocab as
  "species-name codes", but **no injective converter exists** and no gate reads
  species (it is an always-mandatory field record, opaque to `evaluate()`). The
  bridge passes it through unchanged. If a future gate compares species, the
  oracle will need a taxonomy-id <-> species-code map that does not exist today.
- **`accompanyingDocumentType`** — A stores display strings (`ITAHC`);
  DESIGN-DELTA §6 names B's vocab as "kebab codes", but the gate is a
  `presentGate` (reads presence, not value) and no B code list is defined, so
  the value passes through. Fine for scope; a wire mapper (inc-010+) may need a
  code table.
- **Empty collections / value-less line objects** cannot survive A->B: B infers
  group presence from descendant storage, so `{ commodityLines: [] }` and
  `{ commodityLines: [{}] }` both translate to `{}`. This is the oracle blind
  spot the M0 registers already track (PLAN §3 D-notes), surfaced here as a
  documented test rather than a silent drop.

**Backwards compatibility / tests.** Purely additive. Model suite 75 -> 76 test
files, 1104 -> 1130 passed (+26 bridge tests), 11 skipped unchanged. The
`no-display-keys.js` purity gate stays green (the bridge carries no display
keys and is not an obligation/domain entry). prettier + eslint clean.

## 8. The scope bridge — B implications -> A `scope` object · `model/bridge/scope.js` · `EUDPA-288` inc-009

**What this is.** `makeScopeFromB(answers)` — a drop-in for `engine/read.js`'s
`makeScope(answers)`, same four members (`inScope: Set<pathKey>`, `has`,
`answered`, `readyForCheckYourAnswers`), same types. It runs A's answers through
`answersToFulfilments` (inc-008) -> `createObligationEvaluator().evaluate()` ->
projects each in-scope implication back into A's `lib/path.js` pathKey grammar.
Additive: one source file + one differential test file. `fulfilments.js` gained
three exports (`ancestorChain`, `fulfilmentIdToPath`, `groupObligations`) so the
projection reuses inc-008's composite<->positional conversion rather than
re-deriving it. Dark — nothing wired to A's runtime (inc-012+ do that).

**The projection rule (B implication -> A pathKey Set members).** A's
`reconcile` keys its `inScope` Set by `pathKey(node.path)` for every in-scope
node in its structural forest walk — it keys obligation NODES, never bare group
instances (`commodityLines[0]` is not a key). Reproduced from B's per-obligation
implications:

| B implication                                   | A pathKey(s) added                                                                                                                                                                            |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| top-level scalar/field, `inScope`, no `records` | the bare A id (`o.name`) — `pathKey([o.name])` — e.g. `countryOfOrigin`                                                                                                                       |
| grouped leaf, `records: [{ fulfilmentId }]`     | `pathKey(fulfilmentIdToPath(ancestorChain(o), fulfilmentId, o.name))` per record                                                                                                              |
| depth-0 group (`commodityLine`), `inScope`      | the bare group id `commodityLines` (single, even with zero instances)                                                                                                                         |
| nested group (`unitRecord`), `inScope`          | one node key per PARENT instance — derived from the parent's `records`, not the group's own — so a line with an empty unit collection still contributes `commodityLines[i].animalIdentifiers` |

The nested-group case takes the PARENT group's records deliberately: A yields the
nested-group NODE once per parent instance regardless of whether that instance's
nested collection has entries, so keying off the parent (not the group's own
storage-inferred instances) matches A's structural walk exactly and avoids a
spurious empty-nested-collection divergence from the projection itself.

`fulfilmentIdToPath` is reused unchanged for both leaves and group nodes: for a
leaf it consumes all `|chain|` segments of the parent-group fulfilmentId and
appends the leaf id; for a nested-group node it consumes the parent's `|chain|`
segments and appends the group id (the group's own trailing index, if any, is
never read).

**`readyForCheckYourAnswers` — deferred to A's injected fn.** Computed via A's
`makeScope(answers).readyForCheckYourAnswers`, i.e. A's boot-injected
`configureReadyForCheckYourAnswers` fn over A's own inScope. Status derivation
from B's `journeyState`/`containerStatus` is inc-017a's job; deferring keeps the
shape identical without pulling status forward. Cost: makeScopeFromB runs A's
reconcile once for that field — irrelevant in the dark phase, and inc-017a
replaces it with a B-derived computation. `answered(id)` likewise replicates A's
`anyInstanceAnswered` (walks A's answers via A's registry, matches A's obligation
id) — it delegates to A's answered semantics, not B's fulfilments, per the plan.

**Vocab does NOT bite the scope path — confirmed.** inScope keys are obligation
ids and positional indices, never values. The A->B normalisation that
`answersToFulfilments` applies (commodity name->code, camel->kebab, etc.) drives
B's gates but the projected keys are A-vocab on both sides (`commodityLines`,
`commoditySelection`, not `0102`). The differential test asserts set-equality on
the pathKeys directly and it holds — no normalisation needed on the scope path.

### The divergence register — A `inScope` vs B projected `inScope`

Found by the differential test (`scope.test.js`) over the happy-path fixture plus
constructed gate states (region yes/no/unanswered, internal-market yes/no,
commercial/private transport, multi-line/multi-unit, empty collection). **This is
the preview of the M2 oracle (inc-010) scoped to `inScope`; inc-011 rules these.**

**BEHAVIOURAL divergence (gate semantics — the real find):**

1. **`regionOfOriginCode` — B keeps it always-in-scope; A gates it on
   `regionOfOriginCodeRequirement === 'yes'`.** B's `regionCode.applyTo` returns
   `inScope: true` on BOTH branches (mandatory when yes, optional otherwise),
   citing V4; `c-017` struck that claim down ("the retained regionCode are not
   requirements"). So B projects `regionOfOriginCode` into scope in **every state
   where the requirement is not 'yes'** (answered 'no' OR left unanswered) — A
   does not (and wipes any stored value). PERVASIVE, not a single-state red: it
   fires on nearly every realistic session. This is the guaranteed oracle red the
   plan predicted (§2.1 #2). One-line B fix at cutover (make the `no`/unset branch
   `inScope: false`), per `c-017`.

**No other behavioural/gate divergence surfaced.** Every commodity-gated
obligation (passport, tattoo, earTag, horseName, identificationDetails,
description, permanentAddress, numberOfPackages, cph, containsUnweanedAnimals)
AGREES across all five of A's selectable commodities (Cow, Horse, Cat, Dog,
Fish). A's five gate whitelists are exactly `V4 ∩ COMMODITY_OPTIONS`, so the
whitelist gap the corpus flagged (earTag etc.) "propagates to nothing" — A cannot
select the extra codes (PLAN §2.1 correction 2). purposeInInternalMarket,
commercial/privateTransporter and transitedCountries scope also agree (the
mandate difference on transitedCountries — A required, B optional — is not a
_scope_ divergence and does not surface here).

**STRUCTURAL divergences (shape one side cannot represent — M0 registers, NOT gate
behaviour). Present in every comparison; filtered in the behavioural assertions
and asserted separately so they stay documented:**

2. **B-only, always in scope:** `poApprovedReferenceNumber`,
   `responsiblePersonForLoad` (system-populated, `status: mandatory`, no gate —
   on B's `KNOWN_UNWIRED` list; A models neither).
3. **B-only, per line:** `commodityLines[i].commodityType` (B's `commodityType`
   field; A has no counterpart — `c-037`, resolved "drop pending PO sign-off").
4. **Documents D1 topology.** A models accompanying documents as a repeatable
   `documents` collection -> keys `documents`, `documents[i].accompanyingDocument*`
   (4 per doc). B models the same four fields as notification-level singletons,
   always in scope (`presentGate` is in-scope on both branches) -> bare
   `accompanyingDocumentType/AttachmentType/Reference/DateOfIssue`. So A-only:
   `documents` + `documents[i].*`; B-only: the 4 bare ids. B silently caps at one
   document.
5. **A-only:** `importType`, `declaration` — A-side flow obligations the plan
   does NOT admit to the model (`importType` §5, `declaration` is A's submit gate).
   Always in A's scope, no B counterpart.

**For inc-010 (the full oracle):** run A->B only (`COMMODITY_CODES` non-injective,
inc-008 §7). The `inScope` axis is clean except for the one behavioural red
(`regionOfOriginCode`) above; the oracle should add the status and wipe axes on
top of this. The structural divergences (2-5) are NOT oracle reds to chase — they
are the M0 blind spots (the oracle compares two engines over the same inputs and
cannot see a shape one side can't represent); track them via the registers, and
have the oracle's comparator filter them exactly as `scope.test.js` does
(`isStructuralAOnly`/`isStructuralBOnly`) so the real reds stand alone.

**Backwards compatibility / tests.** Purely additive. Model+prototype suite
76 -> 77 test files, 1130 -> 1147 passed (+17 scope tests), 11 skipped unchanged.
Full `verify-increment.sh` green (purity gate + prettier + eslint clean). The
three new `fulfilments.js` exports are additive; inc-008's tests unchanged.

## 9. The full differential oracle — 3 axes · `model/bridge/model-equivalence.test.js` · `EUDPA-288` inc-010

**What this is.** The M2 crux: a differential oracle that runs A's engine and
B's (via the inc-008/009 bridge) over a broad input space and compares **three
axes** — inScope, status (mandate), wipe (data destruction). inc-009 proved the
**scope** axis only; inc-010 widens the input space and adds the **status** and
**wipe** axes, emitting the divergence register that is the M2 gate deliverable
(`retrofit/DIVERGENCE-REGISTER.md`). Additive: one new test file; one `export`
added to `analysis/reachability.js` (`submitReadySeed`, so the oracle reuses A's
own populated seed rather than duplicating it). Nothing wired to A's runtime.

**The three axes.**

- **inScope** — `makeScope` (A) vs `makeScopeFromB` (B), the inc-009 machinery,
  over the widened space. A/B `inScope` pathKey Sets, two directed differences.
- **status (mandate)** — for each non-group obligation in scope on BOTH engines,
  A's static `required` (mandatory/optional) vs B's `effectiveStatus`
  (`impl.status ?? records[0].status`). Mandate is static on both sides
  (inc-003 §6), so this is one scalar per obligation, not a per-record
  dimension. Groups carry no mandate (they enforce cardinality) and are skipped.
- **wipe** — A's `reconcile(answers).wiped` (pathKeys) vs B's purge, computed by
  diffing input `answersToFulfilments` against post-`evaluate` fulfilments and
  projecting destroyed entries back into A's pathKey grammar. `aOnly` = A
  destroys / B retains; `bOnly` = B destroys / A retains.

**Input space (systematic, 39 states).** reachability's 24-state gate grid
(`enumerateScopeStates`) overlaid on `submitReadySeed` — blanks toggle gates OFF
against stored values, a natural wipe probe — PLUS `happy-path.json`, the seed
itself, and 13 constructed edge/probe states (region yes/no/unanswered, land vs
private transport, multi-line/multi-unit, empty collection, and dedicated wipe
probes for region / purpose / transit / commercial-transporter). Normalised
**A->B only** — `COMMODITY_CODES` is non-injective (inc-008 §7).

**The divergence set found — three, all ruled, all "fix B", zero open:**

| Obligation           | Axis    | A                            | B               | Ruled by | Class      |
| -------------------- | ------- | ---------------------------- | --------------- | -------- | ---------- |
| `regionOfOriginCode` | inScope | out unless requirement 'yes' | always in scope | `c-017`  | (ii) fix B |
| `transitedCountries` | status  | mandatory (land transport)   | optional        | `c-038`  | (ii) fix B |
| `regionOfOriginCode` | wipe    | destroys on scope-exit       | retains         | `c-017`  | (ii) fix B |

The **scope** axis reproduces inc-009 exactly (region-code, pervasive — fires
whenever the requirement ≠ 'yes'). The **status** axis newly surfaces the
`transitedCountries` mandate divergence (inc-002 D4) — invisible to inc-009's
scope-only preview because both engines scope it identically. The **wipe** axis
newly surfaces region-code's data-destruction face (inc-002 D3): A destroys,
B retains. A never over-scopes; B never over-wipes; and for every non-region
gated value both engines destroy consistently (the control proving the wipe axis
is not a no-op).

**Divergences are FINDS, not failures.** Each is captured and asserted (via
`KNOWN_SCOPE_BONLY` / `KNOWN_STATUS` / `KNOWN_WIPE_AONLY`) so it stays visible —
never forced equal. A full-sweep test asserts these are the ONLY behavioural
divergences anywhere in the input space, so a NEW divergence breaks the suite and
demands attention. Structural deltas (M0 registers) are filtered via inc-009's
`isStructuralAOnly`/`isStructuralBOnly` taxonomy and asserted separately from the
raw diff so they stay documented.

**M2-green ≠ behaviourally complete.** The oracle is blind to five structural
deltas (documents topology D1, `maxEntriesFrom` D2, `requiredAtLeastOne`, `multi`
array shape, `pathPrefix` depth) — it compares two engines over the same inputs
and cannot see a shape one side can't represent. These are tracked by the M0
registers, not the oracle; see `DIVERGENCE-REGISTER.md`.

**Backwards compatibility / tests.** Purely additive. Model+prototype suite
77 -> 78 test files, 1147 -> 1159 passed (+12 oracle tests), 11 skipped
unchanged. One-line `export` on `reachability.js` (additive; its tests
unaffected). prettier + eslint + purity gate clean.

## 10. The `MODEL=a|b` flag — first wiring of B into A's runtime · `engine/model-flag.js` · `EUDPA-288` inc-012

**What this is.** The dark phase ends here. `engine/read.js`'s `makeScope` — the
sole `scope`-producing seam behind the 9-fn barrel — now dispatches through
either A's engine or B's bridge under a runtime flag. This is the first
increment where B's model informs A's live scope reads.

**The flag.** `engine/model-flag.js` mirrors `services/mode.js`:
`model() => process.env.MODEL ?? 'a'` and `isModelB() => model() === 'b'`.
**`a` is the default** — with `MODEL` unset the behaviour is byte-identical to
A's today. That is the reversibility guarantee.

**The dual-path.** A's original `makeScope` body is preserved verbatim as the
exported `makeScopeA` (pure, always A). A thin dispatcher replaces `makeScope`:

```
export const makeScope = (answers) =>
  isModelB() ? makeScopeFromB(answers) : makeScopeA(answers)
```

Every consumer (controllers via the barrel, `engine/write.js`, `flow/`,
`analysis/simulate.js`) reaches `scope` through this one function, so the flag
routes all of them at once. `get(request, h)` is unchanged in structure — it
still builds `{ journey, answers, scope }` from A's session/journey layer
(`currentJourney`); only the `scope` member now flows through the dispatcher, so
under `b` the journey+answers are A's and the scope is B-derived.

**Recursion break.** `model/bridge/scope.js`'s `makeScopeFromB` computes
`readyForCheckYourAnswers` by delegating to A's engine. It previously imported
`makeScope`; under the flag that would self-recurse when `MODEL=b`
(`makeScope → makeScopeFromB → makeScope → …`). Re-pointed to `makeScopeA`
(A's pure path) — semantically identical (`readyForCheckYourAnswers` was always
A's boot-injected fn) and recursion-free. This introduces an
`engine/read.js ⇄ model/bridge/scope.js` ESM cycle, safe because every
cross-reference is call-time, never module-load-time.

**The other 7 barrel fns stay A-only.** `commit`, `collectionView`,
`collectionCapAt`, `append/update/remove/reconcile`, `submitJourney` keep A's
implementation under both flags. Their write/purge logic is A's `reconcile` +
`destroyWiped`; they call `makeScope` only to return the scope _view_, which now
reflects the active model. inc-013+ reimplements each over B.

**Purity gate.** Untouched — `obligation-purity.js` scans only
`features/*/obligations.js`; the `engine → model/bridge` import is outside its
remit.

**Tests.** `engine/model-flag.test.js` (+7) proves both directions with strict
`process.env.MODEL` hygiene (boot value captured, restored in `afterEach`, so no
leak into other files in a reused worker process): the flag defaults to `a`;
`makeScope` under unset/`a` is byte-identical to `makeScopeA`; under `b` it
delegates verbatim to `makeScopeFromB`; and the flag flips the ruled c-017
divergence (`regionOfOriginCode` gated out under A, retained under B). The full
behavioural sweep stays the oracle's job — `makeScope`'s verbatim delegation
transfers those guarantees. Verify (DEFAULT `a`): 78 -> 79 files, 1159 -> 1166
passed, 11 skipped unchanged; purity + prettier + eslint clean.

**Under `MODEL=b` the suite is NOT green yet (18 failures) — and that is
expected at inc-012, not a regression.** Two kinds: (i) _differential tests_
(`model-equivalence.test.js`, `model/bridge/scope.test.js`) that use `makeScope`
as their A reference — now that it dispatches, `MODEL=b` collapses the A-vs-B
diff to zero. These should re-point their A reference to `makeScopeA` to stay
flag-independent (a test-repoint for inc-013+ / the oracle owner; NOT done here
to avoid editing the safety net mid-increment). (ii) _scope-driven behavioural
tests_ (`read.test.js`, `resume-self-heal`, `gates`, `task-rows`,
`check-answers`, `reachability`, `t2-hub-copy`) surfacing B's not-yet-applied
divergences — c-017 `regionOfOriginCode` retained, B's system fields
(`poApprovedReferenceNumber`, `responsiblePersonForLoad`) now in scope, documents
D1 topology — plus the fact that status derivation, `flow/`, and the write/purge
path are still A. Green-under-both-flags is an **end-of-M3 target** (inc-017a),
not inc-012's.

**For inc-013 (commit over B).** While both halves are half-wired, the write
path is fully A: `engine/write.js`'s `commit`/`append/*` run A's `reconcile` +
`destroyWiped` for mutation, then call `makeScope` only for the returned view.
So under `MODEL=b` today, **B's evaluator purge never runs** — A destroys
out-of-scope data, and the B-derived scope view is computed _after_ A's wipe.
The one place this shows: on a region-gate-off commit, A destroys
`regionOfOriginCode` (A wipes) but the B scope view reports it in scope (c-017,
B retains) — a transient view/data mismatch that disappears once inc-013 moves
the purge onto B _and_ inc-017 applies the c-017 "fix B". inc-013 must decide
whether `commit` under `b` runs B's purge instead of A's `destroyWiped`, and
must re-point its own `makeScope` reads consistently.

## 11. The write purge dual-pathed — B's evaluator becomes the wipe authority under `b` · `engine/write.js` · `model/bridge/purge.js` · `EUDPA-288` inc-013

**What this is.** inc-012 dual-pathed only the scope _read_; the write path
stayed fully A, so B's purge never ran. This increment dual-paths the write
**purge decision** so under `MODEL=b` the WIPE is decided by B's evaluator, not
A's `reconcile`. **Default `a` is byte-identical** — the whole existing suite
stays green (79 → 80 files, 1166 → 1169 passed, 11 skipped unchanged; the +3 are
inc-013's own test). Any default regression would mean the dual-path leaked into
A's path; there is none.

**Step 0 — the oracle made flag-independent.** inc-012 left
`model/bridge/model-equivalence.test.js` and `model/bridge/scope.test.js` using
`makeScope` (now the flag dispatcher) as their **A reference**, so they only
validated under default. Their A-side is re-pointed from `makeScope` →
`makeScopeA` (the flag-independent A path, already exported from
`engine/read.js`). Only the scope axis needed it — the oracle's status axis
(`reconcile(answers).inScope`) and wipe axis (`reconcile(answers).wiped` /
`evaluator.evaluate`) were already flag-independent. The oracle now compares A
vs B regardless of `MODEL`, so it validates BOTH flag paths. No assertion
changed — test-infra only; still green under default.

**The wipe authority, flag-selected.** `engine/write.js` gains one helper:

```
const purge = (answers) => {
  const wiped = isModelB() ? wipeSetFromB(answers) : reconcile(answers).wiped
  destroyWiped(answers, wiped)
}
```

Both branches return **A pathKeys** for A's `destroyWiped`, so the session /
journey / save layer around every mutator is shared for both flags (B has none).

**How `commit` derives the wipe set under `b`.** New module
`model/bridge/purge.js` exports `wipeSetFromB(answers)`, the write-path
counterpart of `scope.js`'s `makeScopeFromB` and the exact mechanism the oracle's
wipe axis uses (inc-010): `answersToFulfilments(answers)` (A→B, vocab-normalised)
= `fIn` → `evaluator.evaluate(fIn).fulfilments` (the converged post-purge view) =
`fOut` → for every non-group leaf obligation answered in `fIn` but absent from
`fOut`, emit its A pathKey via the bridge's composite→positional rule
(`fulfilmentIdToPath`; top-level leaves emit `pathKey([name])`). The
**difference between pre- and post-purge fulfilments IS what B destroys.** The
wipe-set (not `fulfilmentsToAnswers`-rebuild) approach is deliberate: it deletes
only the paths B drops and leaves A-only data B never models (`importType`,
`declaration`, `documents[1]+`, upload `filename`) untouched.

**Mutators — changed vs inherited.** Three mutators shared the
`reconcile` + `destroyWiped` purge step and are now dual-pathed via the `purge`
helper: **`commit`**, **`removeEntryAt`**, **`reconcileEntriesAt`**.
**`appendEntryAt`** and **`updateEntryAt`** were left unchanged — they mutate +
save with **no** purge step (append is cap-guarded only; update is an in-place
`with`), so there is no wipe decision to route. A's array mechanics
(`setAt`/`toSpliced`/`with`, the cap check, the index validation) are untouched
in all five. The returned `scope` view already flows through inc-012's
`makeScope` dispatcher, so under `b` the post-purge view is B-derived and
consistent with B's purge.

**The 3 ruled divergences remain unfixed until inc-017 — asserted as known.**
Under `b`, `wipeSetFromB` reproduces B's ACTUAL purge, region-code retention and
all: B keeps `regionOfOriginCode` in scope on its optional branch (c-017 struck
that retain-claim down by name, but the fix lands in B at inc-017), so on a
region-gate-off commit B destroys nothing and the code SURVIVES the write —
where A wipes it. `engine/commit-purge-authority.test.js` asserts this as a
**known divergence** (region retained under `b`, wiped under `a`; the key is
absent from `wipeSetFromB`), and proves B's purge actually fires under `b` on a
gate both engines agree on (`purposeInInternalMarket` out-of-scope → destroyed,
commit's destroyed set === `wipeSetFromB`). Env hygiene: `process.env.MODEL` is
saved in `beforeEach` and restored in `afterEach` so the flag cannot leak across
files. c-017 (region ×2) and c-038 (`transitedCountries` mandate) are NOT
repaired here — that is inc-017 at cutover.

**Result under `MODEL=b`.** Moving the purge onto B reduced the suite failures
from inc-012's 18 to **8**, all in the status/flow/scope class inc-017/inc-017a
own (`t2-hub-copy`, `reachability`, `read`, `resume-self-heal`, `gates`,
`task-rows`, `check-answers` navigation) — B's not-yet-applied ruled divergences
plus status/`flow/` still being A. None is a write/purge failure; green-under-
both-flags stays the inc-017a target.

## 12. `collectionView`'s `complete` dual-pathed — B judges per-instance completeness under `b` · `engine/evaluate/collection-view.js` · `model/bridge/collection-complete.js` · `EUDPA-288` inc-014

**What this is.** `collectionView(answers, collectionPath)` returns
`[{index, path, entry, complete}]`. A owns storage under BOTH flags (the bridge
converts A↔B on demand; B has no persistence), so `entries`, `index` and `path`
come from A's positional array and are **identical under `a` and `b`** — an
empty or partial A entry is never lost. Only **`complete`** is a model judgment,
so only `complete` is dual-pathed: under `a` A's `entryComplete`; under `b`
`entryCompleteFromB` (`model/bridge/collection-complete.js`). **Default `a` is
byte-identical** — the existing suite is unchanged (80 → 81 files, 1169 → 1175
passed, 11 skipped; the +6 are inc-014's own test).

**Instance identity is positional** — A's array index, the same under both flags.
`instanceFulfilmentId(collectionPath, index)` (new export in
`bridge/fulfilments.js`) maps an A positional entry to B's composite fulfilmentId
prefix (`line0/unit<i>`) reusing the existing `segmentToken` + `ancestorChain`
machinery — the instance-level counterpart of `fulfilmentIdToPath`.

**How `entryCompleteFromB` derives `complete`.** It reproduces B's
`containerStatus`-FULFILLED verdict scoped to one instance: evaluate
`answersToFulfilments(answers)`, then the instance is complete iff there is **no
unsatisfied mandatory concern** beneath its fulfilmentId — a mandatory leaf
record left unfulfilled (`effectiveStatus` record `status`, defaulting to
mandatory; addresses via `domain.isComplete`) or an unmet per-instance `anyOf`
invariant (`groupInvariantErrors`). A fully-empty TOP-LEVEL entry is caught by
its unconditional mandatory field leaves (checked at the instance even without a
B record), so A and B agree it is incomplete. **Structural B-only obligations
(`commodityType` c-037, the `accompanyingDocument*` block, the two system
fields) are excluded** — the model-equivalence oracle filters them off every
axis (`isStructuralBOnly`), and A's model never carries `commodityType` at all,
so admitting it would read every line incomplete under `b`.

**`collectionCapAt` stays A-side under BOTH flags.** `maxEntriesFrom` (c-031) is
the one A-only capability with no B channel — B's decision surface has no numeric
reference and no admission-control primitive (PLAN §5.1′). Porting it to B is
deferred to **inc-024a**; until then the cap reads A's `cardinality.js`
regardless of `MODEL`, mirroring how inc-013 kept A's save layer for both flags.
Stated in the `collectionCapAt` doc comment.

**Agreement, and two captured finds (NOT repaired).** For representative
full/partial/empty states the completeness path **agrees** A vs B — the 3 ruled
divergences (region-code, transit) are not in the collection-entry completeness
path (region-code is top-level; transit is a scalar mandate). Two NEW structural
divergences surfaced and are captured as known-divergence assertions in
`collection-complete.test.js`, not forced equal:

1. **A's `collectionView` calls `entryComplete` with no `ctx`.** With `ctx` null
   the enclosing-frame `activatedBy` predicate is never evaluated, so
   `permanentAddress` (required, gated on 01061900) is treated as mandatory for
   **every** unit regardless of commodity. B scopes it correctly, so a Cow line
   carrying an identifier but no `permanentAddress` — the `happy-path.json` shape
   — reads **complete under `b`, incomplete under `a`** (B is the more faithful
   reading; A's collectionView is over-strict).
2. **A fully-empty NESTED instance vanishes from B.** B infers instances from
   leaf composite prefixes, so a unit with no stored leaf is never enumerated and
   B cannot flag its unmet `anyOf`; A, reading its own array, still shows the
   entry and marks it incomplete. So an empty unit reads **complete under `b`,
   incomplete under `a`**. (A fully-empty TOP-LEVEL line does agree — its
   unconditional mandatory field leaves are checked directly.)

**Result under `MODEL=b`.** Suite failures stay at **8** — the exact
inc-013 set (`t2-hub-copy`, `reachability`, `read`, `resume-self-heal`, `gates`,
`task-rows`, `check-answers` navigation), all status/flow/scope class that
inc-017/inc-017a own. inc-014 adds **zero** new `b` failures; no collectionView
or completeness test is among them.

## 13. The mutators audited under `b` — verification, no new dual-pathing · `engine/mutators-under-b.test.js` · `EUDPA-288` inc-015

**What this is.** inc-013 dual-pathed the write purge; inc-014 dual-pathed
`collectionView`'s completeness judgment. inc-015 closes the write-path cutover
by **auditing every mutator under `MODEL=b`** and proving each correct with
mutation-under-`b` tests. **A owns storage under both flags** (positional array;
B holds no instance record — it infers instances from leaf composite prefixes),
so every mutator's storage mechanic is A-side and flag-identical, and the only
model judgments on the write path (purge; append cap) were already routed at
inc-013/inc-014. **No new dual-pathing was written, and none was needed** — the
expected outcome. **Default `a` is byte-identical** (81 → 82 files, 1175 → 1187
passed, 11 skipped unchanged; the +12 are inc-015's own tests). MODEL=b failures
stay at **8** (inc-013 set); inc-015 adds zero new `b` failures.

**Per-mutator verdict.**

- **`commit`** — _already correct under `b`._ Its purge is inc-013's flag-selected
  helper (`wipeSetFromB` under `b`); its returned scope flows through inc-012's
  `makeScope` dispatcher. No A-vs-B storage divergence; no un-routed judgment.
  (Covered by `commit-purge-authority.test.js`; not re-tested here.)
- **`appendEntryAt` / `appendEntry`** — _already correct under `b`._ No purge step.
  Storage is `setAt(list, [...list, entry])` — pure A-positional, flag-identical.
  Its one model-dependent decision, the cap, is A-side `collectionCapAt`
  (`maxEntriesFrom`, c-031) under **both** flags by inc-014's ruling — B has no
  numeric/admission-control channel (ported at inc-024a). The cap rejection fires
  identically under `a` and `b` (tested).
- **`updateEntryAt` / `updateEntry`** — _already correct under `b`._ In-place
  `list.with(index, entry)`; no purge, no scope, no cap, no model read at all.
  Flag-identical (tested under both).
- **`removeEntryAt` / `removeEntry`** — _already correct under `b`._ Positional
  `list.toSpliced(index, 1)`, then inc-013's flag-selected `purge`. Under `b` the
  wipe is B-authoritative (`wipeSetFromB`): removing the last unweaned-triggering
  line drops the now-orphaned notification-level `containsUnweanedAnimals`, and
  the destroyed key is present in `wipeSetFromB` of the post-remove answers
  (tested).
- **`reconcileEntriesAt`** — _already correct under `b`._ Key-matched positional
  rebuild (`existingByKey`), then inc-013's `purge`, then `makeScope` (inc-012
  dispatcher). Multi-select→collection sync preserves kept lines' nested data;
  the scope-and-wipe pass is B-authoritative under `b` (tested).

**Instance identity is positional under both flags — proven, not asserted.** An
empty appended nested unit (`{}` into `animalIdentifiers`, uncapped) has **no
leaf**, so B infers no instance and cannot address it — yet A's positional array
holds it verbatim under `b`. The test appends `{}` under `MODEL=b` and asserts the
array is `[{}]`. This is the concrete demonstration that storage identity is A's
array index, never B-addressability.

**No new divergence.** The mutators' storage does not diverge under `b` (A owns
it), as expected. The only `b`-visible mutation behaviours are the already-known,
already-ruled ones inherited from inc-013/inc-014 (region-code retention c-017;
the collectionView `ctx`/empty-nested finds) — none is on a mutator's storage
path. No new behavioural divergence surfaced.

**For inc-016 (`submitJourney` over `b`).** `submitJourney` is the one barrel
function still fully A: it reads `makeScope(answers).readyForCheckYourAnswers`
(the inc-012 dispatcher — so scope is already B-derived under `b`) and calls
`records.finalise`. Its `readyForCheckYourAnswers` derivation comes via
`configureReadyForCheckYourAnswers`, which under `b` still routes through A's
`flow/section-status.js` — that (with `read`/`gates`/`task-rows`) is part of the
8-failure status/flow class inc-017/inc-017a own. inc-016 should decide whether
`submitJourney`'s readiness gate reads B's `journeyState` under `b`, or whether
that is left entirely to inc-017a's status migration. The save/finalise layer is
A under both flags (B has no persistence), mirroring every other mutator.

## 14. `submitJourney` audited under `b` — verification, no code change · `engine/submit-under-b.test.js` · `EUDPA-288` inc-016

**What this is.** inc-015 closed the write-mutator cutover; inc-016 closes the
last barrel function, `submitJourney`, by **auditing it under `MODEL=b`** and
pinning it with a submit-under-`b` test. **The verdict is NO code change** —
the expected outcome, mirroring inc-015. **Default `a` is byte-identical** (82
→ 83 files, 1187 → 1189 passed, 11 skipped unchanged; the +2 are inc-016's own
tests). MODEL=b failures stay at **8** (the inc-013 status/flow/scope set);
inc-016 adds zero new `b` failures.

**`submitJourney` verdict — correct under `b` as written, no change.** Its two
model-relevant parts were traced:

- **The readiness gate reads a B-derived scope.** `submitJourney` calls
  `makeScope(journey.answers)` — the inc-012 dispatcher — so under `b` the
  `scope` object (its `inScope`, `has`, `answered`) is B-derived via
  `makeScopeFromB`. The gate reads `scope.readyForCheckYourAnswers`, which
  under `b` still delegates to A's boot-injected fn
  (`makeScopeFromB` → `makeScopeA` → `configureReadyForCheckYourAnswers`).
  So submit already gates on the B-dispatched scope's ready flag; no new
  dual-pathing is needed here.
- **`records.finalise` stays A under BOTH flags.** It is A's persistence
  (session/records save layer); B has no persistence, so finalise is
  flag-agnostic, exactly like every other mutator's save layer (inc-013/015).

**The readiness→B migration is DEFERRED to inc-017a — explicitly.**
`readyForCheckYourAnswers` under `b` is still A-computed (via `makeScopeA`'s
boot-injected `flow/section-status.js` fn). Migrating it to a B
`journeyState`/`containerStatus` derivation is **not** inc-016's job — the whole
status/flow status class (`read`/`gates`/`task-rows`/`section-status`) moves
together at inc-017a, and pulling only submit's ready flag onto B here would
split that class. inc-016 confirms submit's gate correctly reads the B-derived
scope's ready flag (currently A-computed) and works; **inc-017a completes the
readiness→B migration.**

**Test.** `engine/submit-under-b.test.js` (+2) forces `MODEL=b` (saved/restored
for env hygiene) and proves both directions with the boot-injected ready fn
stubbed (the isolation the existing `submit-is-finalise.test.js` uses): when
CYA-ready, submit finalises the journey **by its journeyId** (`result.ok`,
`result.journey.journeyId === journeyId`, status flipped to `SUBMITTED` on that
record — the observable proof finalise ran with the right id); when not ready,
`{ ok: false }` and the record stays `IN_PROGRESS` (finalise never ran). Both
the ready-flag delegation and finalise flow through the `b` path.

**No new divergence.** `submitJourney`'s storage/finalise does not diverge under
`b` (A owns persistence), and its gate is the already-B-derived scope. The only
`b`-visible submit behaviour is inherited from the ruled, not-yet-repaired
status/scope class (region-code retention c-017 et al.) that inc-017/inc-017a
own — none is on submit's own path.

## 15. The three ruled behavioural fixes applied to B's manifest — oracle now proves ZERO divergence · `model/obligations/obligations.js` · `EUDPA-288` inc-016a

**What this is.** M2's oracle (inc-010) found **exactly three** behavioural
divergences A-vs-B, all ruled, all "fix B" (see
`retrofit/DIVERGENCE-REGISTER.md`). inc-012..016 wired B behind `MODEL=b` with
those divergences still present, documented as `KNOWN_*` in the oracle. inc-016a
**applies the three fixes to B's evaluator manifest**, then shrinks the oracle's
`KNOWN_*` sets to empty and asserts zero behavioural divergence across the whole
input space. Isolated ahead of the status-engine swap (inc-017a) so "apply the
rulings" is a separate, verifiable step.

**The three fixes (all one-liners on `obligations.js`).**

- **`regionOfOriginCode` scope + wipe — `c-017`.** The gate's no/unset branch
  was `{ inScope: true, status: 'optional' }` (B kept the field in scope on
  every branch, with a comment citing V4 for retention). Changed to
  `{ inScope: false }`, so `equalsGate(regionCodeRequirement, 'yes', {inScope,
mandatory, reasons}, { inScope: false })`. B now takes the field out of scope
  when the requirement is not `'yes'`, and the converged purge destroys the
  stored value — matching A on both the scope axis (#1) and the wipe axis (#3).
  The misleading "V4 does not purge regionCode" retain-value comment was
  **deleted** so it is never cited again. `c-017` (spec gate 2026-07-07): B's
  retained `regionCode` "are not requirements".
- **`transitedCountries` mandate — `c-038`.** The gated-in (`whenTrue`,
  land-transport) branch stamped `status: 'optional'`; changed to
  `status: 'mandatory'`. `c-038` (Figma conflict walk 2026-07-13): transit
  resolves **REQUIRED** when meansOfTransport is Railway / Road Vehicle. The
  out-of-scope branch is untouched (#2).

**The oracle now proves ZERO divergence.** `model-equivalence.test.js`'s
`KNOWN_SCOPE_BONLY`, `KNOWN_STATUS` and `KNOWN_WIPE_AONLY` are now all
`new Set()` (empty). The full-sweep test asserts every axis (scope, status,
wipe) agrees A-vs-B across the entire input space — any residual divergence
would fail the sweep because there is no longer any known entry to excuse it.
The three per-axis DIVERGES tests were flipped to assert **convergence** (they
are the proof the fixes bit). `scope.test.js`'s two region-code DIVERGES tests
were likewise flipped to agreement.

**B model tests updated to the ruled truth** (never deleted — each carries a
`c-017`/`c-038` citation):

- `obligations/evaluator.test.js` — region gate: absent/`no` now **out of
  scope** (was optional-in-scope); stored value now **purged** on flip (was
  retained); empty-input shape now `{ inScope: false }`. Transit gate:
  road-vehicle/railway now **mandatory** (was optional).
- `analysis/reachability.test.js` — regionCode reclassified **non-total →
  WITNESS** (was TRIVIAL/total-over-branches), with `no` → out of scope; the
  9-site round-trip table sets transitedCountries **mandatory** (was optional).
- `bridge/fulfilments.test.js` — land-transport transit status now **mandatory**.
- `engine/commit-purge-authority.test.js` — under `MODEL=b`, B now **wipes**
  regionOfOriginCode (was the "retains, unfixed until inc-017" pin).
- `engine/model-flag.test.js` — the flag-flip pin moved off the (now-resolved)
  region scope divergence onto a **B-only structural field**
  (`poApprovedReferenceNumber`), which still observably differs A-vs-B.

**Default `a` byte-identical.** 83 files / 1189 passed / 11 skipped — unchanged
from inc-016. The B model tests above run under the default (`a`) invocation and
now pass at the same total; nothing on A's engine was touched.

**MODEL=b failures: 8 → 5.** The three region-code scope failures cleared
(B's scope now matches A). The remaining five are the status/flow/reachability
class (`t2-hub-copy`, `analysis/reachability`, `flow/gates`, `flow/task-rows`,
`check-answers`) — **inc-017a's** status-engine swap, deliberately not chased here.

## 17. B grows a `documents` collection — D1 topology resolved · `model/obligations/obligations.js` · `model/bridge/fulfilments.js` · `EUDPA-288` inc-016b

**What this is.** The last structural divergence. B previously modelled the four
accompanying-document fields as **notification-level singletons**; A nests them
in a repeatable `documents` collection. inc-017's flow re-point needs a
`documents` collection to walk (`documents.accompanyingDocumentType`), so B grows
one, matching A's topology and the ruled V4 shape (cap-10 collection; c-034;
journey-spec:1353; DIVERGENCE-REGISTER D1). This is per-record **scope** (B
expresses it), not per-record mandate (Phase-5) — inc-003 confirmed.

**The model change.**

- New structural group `documents` (`{ id, name: 'documents' }`, no `applyTo`,
  **no `requires` floor** — documents are optional; the V4 cap of 10 is enforced
  controller-side, `MAX_DOCUMENTS`). Matches A, which has no collection floor.
- The four fields gain `within: documents`.
- `accompanyingDocumentType` becomes the per-record **trigger**: a plain
  `mandatory` field (no `applyTo`). A models it `required: true` — a document
  record cannot exist without a type.
- The three dependants (`AttachmentType`/`Reference`/`DateOfIssue`) gate on the
  **same-level** type via a new helper `presentPerRecord(accompanyingDocumentType,
null, [reason])`, `status: 'mandatory'`: in scope + mandatory on each document
  record whose type is answered, out of scope (and purged) elsewhere. This
  replaces the old notification-level all-or-nothing `presentGate` block (and its
  self-referencing `{ id }` proxy, now removed). The self-loop is gone.

**New helper + its tax.** `presentPerRecord` is the projecting dual of
`presentGate` (predicate = "is answered", `filterAndProject` with `null`
projection for same-level gates — the `commodityLine`/`unitRecord` pattern). The
STRUCTURED_HELPER_TYPES tax is paid: a `case 'presentPerRecord'` in
`analysis/reachability.js` `synthesiseWitness` (witness = any non-blank value),
its entry in `STRUCTURED_HELPER_TYPES`, a `deriveDependsOn` case in `helpers.js`,
and a `SAMPLE_OBLIGATIONS` entry in `analysis/coverage.test.js`. Coverage pins it
both ways.

**Bridge simplified.** inc-008's `DOCUMENT_FIELD_AIDS` special-case (which bridged
A's collection ↔ B's singletons and **capped at one document**) is **gone**.
Documents now round-trips as an ordinary A-collection ↔ B-collection mapping, like
`commodityLines`: each field becomes a records-map keyed by document instance
(`{ line0: …, line1: … }`), so a **multi-document** journey survives A→B→A.

**Oracle: documents now AGREES.** `model-equivalence.test.js` +
`scope.test.js` dropped the `isStructuralAOnly`/`isStructuralBOnly` exclusions for
`documents`/`documents[N]`/`accompanyingDocument*`. Documents converges as a
normal nested collection — zero behavioural divergence still holds across the
whole input space (only happy-path populates documents, all fields present, so
both engines scope the same five keys with the same mandates). `collection-
complete.js` dropped the four fields from `STRUCTURAL_B_ONLY` (no longer B-only).

**Default `a` byte-identical.** A's `features/documents/obligations.js` untouched.
83 files / 1192 passed / 11 skipped — +3 vs inc-016a's 1189, from the granular
per-field document tests (`it.each` over the three dependants) replacing the old
notification-level block tests. Nothing on A's engine was touched.

**Stayed per-record SCOPE — no `buildImplication`/Phase-5 change.** The gate is a
helper + manifest change only; the evaluator core is untouched.

## 18. `flow/` re-pointed to B's manifest — survives M4's `registry.js` deletion · `flow/obligation-source.js` · `flow/dispatch.js` · `flow/prerequisites.js` · `flow/entry-guard.js` · `EUDPA-288` inc-017

**What this is.** `flow/`'s three registry reads (dispatch, prerequisites,
entry-guard) resolved obligations from A's `registry.js`. M4 deletes `registry.js`,
so those reads must move to B's manifest (`model/obligations/obligations.js`) —
which now (post inc-016b) has the topology to answer them. Status resolution stays
on A's registry; that swap is inc-017a's job, out of scope here.

**The adapter.** `flow/obligation-source.js` is a tiny flow-level shim over B's
flat manifest, exporting the four things `flow/` needs:

- `walkObligations()` — generator yielding `{ templatePath, obligation }`, where
  `templatePath` is the dotted chain of **names** built by walking each
  obligation's `within` back-references (B `name` == A id, so the paths equal A's
  `walkObligations` template paths — e.g. `commodityLines.commoditySelection`).
  `obligation` is the real B obligation. No `.item` recursion — B is flat.
- `obligationByName(name)` — the B analogue of A's `registry.byId(id)`.
- `SYSTEM_POPULATED` — the totality-assert exclusion set (below).
- `ENFORCED_AT_CONTINUE` — the flow-level continue-gate set (below).

No existing model enumerator produced name-paths (`buildAncestorGroups` keys by
`.id` UUID and returns obligation objects), so the adapter owns the tiny walk.

**`SYSTEM_POPULATED` — totality exclusion.** A's dispatch boot asserts every
non-`system` obligation is collected by exactly one page. A carries **no** `system`
flag and **doesn't model** `poApprovedReferenceNumber`, `responsiblePersonForLoad`
or `commodityType` at all, so its walk never sees them. B **does** model all three,
none collected by any page, so a naive B walk would fail the totality assert. The
adapter names them in `SYSTEM_POPULATED`; dispatch filters
`!SYSTEM_POPULATED.has(obligation.name)` (was `!obligation.system`), and entry-guard
reads `!SYSTEM_POPULATED.has(key)` (was `!obligation.system`) — mirroring A not
modelling them. Group containers stay covered by A's existing `ownerOfObligation`
ancestor-walk, preserved untouched.

**`ENFORCED_AT_CONTINUE` — flow-level continue set.** A tagged two obligations
`enforcedAt: 'continue'` (`countryOfOrigin`, `commoditySelection`); B's manifest
carries no `enforcedAt`. Rather than retrofit the flow concern onto B's domain
model, the flow set lives on the adapter as `new Set(['countryOfOrigin',
'commoditySelection'])`. `prerequisites.js` filters
`ENFORCED_AT_CONTINUE.has(obligation.name)` (was `obligation.enforcedAt !==
'continue'`). inc-018 (importType placement) shares this source.

**Path-safety on `name`.** dispatch's boot metacharacter check moved from
`obligation.id` (a B UUID — always safe) to `obligation.name`, the actual dispatch
key. `dispatch.test.js`'s spy re-points from `registry.walkObligations` to
`obligationSource.walkObligations` and yields `{ name: 'bad.id' }`.

**Default `a` byte-identical.** `flow/` now reads B under both flags; because B
names == A ids and topologies match, dispatch/prereq/guard results are unchanged.
A's `registry.js` still exports `walkObligations`/`byId` for the rest of the
`a`-runtime — only `flow/` stopped importing it.

## 19. The status bridge — B derives the 5-way task/section status · `model/bridge/status.js` · `flow/task-rows.js` · `flow/section-status.js` · `engine/readiness-config.js` · `EUDPA-288` inc-017a

**What this is.** Sam's ruling (PLAN §5.5): take B's status derivation, retire A's
`engine/status.js` machinery. Under `MODEL=b` the task-list / section / CYA-readiness
status is B-derived; default `a` stays byte-identical (A's `status.js` remains the
default path, deleted at M4/inc-022). Scope of the swap: the status COMPUTATION moves
to B. A's row/section STRUCTURE (task-rows, hub groups, facet membership) stays the
input — the full 3-spine structural collapse is a separate presentation refactor,
NOT done here (follow-up).

**The bridge — B-derived 5-way.** `statusOfFromB(parts, answers, inScope)` returns the
SAME five constants as A's `statusOf`. Its OUTER classification is copied verbatim from
A (same NA / OPTIONAL / NOT_STARTED / IN_PROGRESS / FULFILLED branches, same
`partRequired` / `partStarted` reads off A's registry + answers) — so the
presentation-facing edge cases match A exactly: empty optional collection → OPTIONAL,
partial optional → IN_PROGRESS, empty required collection → NOT_STARTED. B's own
entry-granularity classifier (`classifyEntries`) has different edge semantics there
(empty → NA, partial-optional → FULFILLED), so mirroring A's part-granularity was the
only way to keep the two engines in agreement.

**The crux — `partSatisfied` sourced from B.** The ONE predicate that moves to B is the
completeness judgement. `partSatisfiedB` walks the SAME collection tree A's
`collectionComplete`/`entryComplete` walk, but sources three things from B's evaluator
state (`answersToFulfilments` → `evaluate`): per-record SCOPE (a leaf is present for a
record iff B's implication `records[]` carries that record's fulfilmentId — B's
post-purge membership replaces A's `activatedBy` predicates); per-record MANDATE
(`effectiveStatus(leaf, recId, state)` mandatory/optional replaces A's static
`required`); and FULFILMENT (`domainEntry.isComplete` for addresses, else
`!isBlankValue`). The `requiredOneOf` any-of rule (e.g. ≥1 identifier per unit) mirrors
B's `groupInvariantErrors` semantics per record.

**Facets from B.** A facet `{collection, only/except}` is enumerated from A's registry
(so B-only obligations like `commodityType` A never counted are excluded), then each
selected member's leaves map to B by `name` for the scope/mandate/fulfilment read;
sub-collection members recurse over all their members. The collection FLOOR
(`requiredAtLeastOne`, e.g. the ≥1-unit-per-line rule on `animalIdentifiers`) is read
from A's registry because B models it only partially (`commodityLine` has a
`minEntries` but `animalIdentifiers` carries only `anyOfIds`, no per-line unit floor);
the bridge composes A's structural cardinality with B's per-record implications. No
change to B's manifest or `buildImplication`.

**B-unmodelled obligations.** `importType` and `declaration` are A-registry
obligations B's manifest does not model (D7/D8, ruled A-side flow). For a plain part
with no B obligation, `partSatisfiedB` falls back to A's `isAnswered(answers[id])` —
A owns them, so a phantom B fulfilment would be wrong. This is what keeps the `start`
section's `importType` roll-up agreeing between the row and section spines under `b`.

**Dual-path point.** At the callers, not inside A's `statusOf` (importing the bridge
into `status.js` would cycle, and `status.js` is deleted at M4): `rowStatus`
(`task-rows.js`) and `sectionStatus` (`section-status.js`) select `statusOfFromB` under
`isModelB()`, A's `statusOf` otherwise. `readyForCheckYourAnswers` already rolls up
through `rowStatus`, so it becomes B-derived under `b` with no edit.

**Readiness cycle severed.** inc-012's `makeScopeFromB` reached readiness by calling
`makeScopeA` (a `read.js ↔ scope.js` cycle inc-012/013 flagged for M4). The
boot-injected readiness registry moves out of `read.js` into `engine/readiness-config.js`
(a leaf module); `makeScopeFromB` now calls `computeReadyForCheckYourAnswers(answers,
inScope)` with B's projected `inScope`. `scope.js` no longer imports `read.js` — the
cycle is gone (only `read.js → scope.js` remains). The injected fn is still
`section-status.readyForCheckYourAnswers`, which under `b` rolls up through the
dual-pathed `rowStatus` → `statusOfFromB`, so production readiness is fully B-derived;
the indirection keeps test stubs (`configureReadyForCheckYourAnswers`) honoured on both
paths.

**Default `a` byte-identical.** A's `statusOf`/`task-rows`/`section-status` are the
default branch, untouched; the unit suite holds at 1192 (+19 new `status.test.js`
proofs = 1211). Oracle stays zero-divergence. Under `MODEL=b` the two remaining
failures — `check-answers` "redirect to declaration" and the reachability prover — are
NOT status: both are the D7/D8 `importType`/`declaration` A-only obligations being
absent from B's `inScope`, so their owning pages report `owning-page-unreachable-in-scope`
under `b`. That is inc-018's (importType/declaration placement) concern; admitting them
to B's `inScope` here would break the D7/D8 raw-scope oracle test.

## 20. A-side flow obligations projected into the bridge FULL scope · `model/bridge/scope.js` · `EUDPA-288` inc-018

**What this is.** Sam's ruling (PLAN §5.5): `importType` (service-entry filter,
`c-024`/`c-032`) and `declaration` (submit-time tick) stay A-side flow and are NOT
admitted to B's manifest — B has no counterpart on the V4 wire contract. But their
owning pages (`import-type`, `declaration`) must stay reachable under `MODEL=b`, and
`inc-017a` closed with two `MODEL=b` failures traced to exactly this: `analysis/
reachability.test.js` "no owed obligation unreachable" and `features/check-answers/
check-answers.test.js` "redirect to declaration once prerequisites answered", both
`owning-page-unreachable-in-scope` because B's evaluator scope omits `importType`/
`declaration`, so `pageGatePasses` → `inScopeReachable([...])` fails for their pages.

**FULL scope vs RAW scope.** The projection distinguishes two sets the bridge exposes:

- `rawInScopeFromB(answers)` — B's evaluator output projected into A's pathKey grammar,
  B's manifest only. Still EXCLUDES `importType`/`declaration`. This is the set the
  oracle diffs against A (`model-equivalence.test.js`'s `rawScope`, `scope.test.js`'s
  `diff` — both re-pointed here), so the D7/D8 "A-only, not admitted to B" assertions
  stay green: B's raw scope is byte-unchanged.
- `makeScopeFromB(answers).inScope` — the FULL scope the controllers/hub/reachability
  consume. `projectAOnlyFlowScope` layers the A-only flow obligations ON TOP of the raw
  projection, sourced from A's OWN `reconcile(answers)` (faithful to A, future-proof if
  A ever gates them). `A_ONLY_FLOW_OBLIGATIONS = ['importType', 'declaration']` derives
  from `retrofit/mapping.json`'s `a-only` entries (`documents` converged to `exact` at
  inc-016b, so it is no longer a-only). Both are unconditional top-level obligations, so
  A's reconcile always scopes them in as bare-id pathKeys.

**enforcedAt: importType NOT added to `ENFORCED_AT_CONTINUE`.** `conflicts.json` c-023
says `importType` "joins the continue level as the service entry filter", but A realises
that as the entry FILTER / `flow/entry-guard.js` (the `hasEnteredThroughFilter`
run-state + deep-link redirect), NOT as a downstream continue-prerequisite. A's
`importType` obligation carries no `enforcedAt`, and adding it to `ENFORCED_AT_CONTINUE`
would make every post-filter page require `importType` answered under BOTH models —
breaking the reachability witnesses (whose `submitReadySeed` carries no `importType`) in
default `a`. So it stays out; A's behaviour is matched exactly.

**Scope of the change.** Additive only. `readyForCheckYourAnswers` is unaffected — its
`taskRows` never cover `importType`/`declaration`, so the full vs raw `inScope` yields
identical readiness. The oracle's behavioural axes filter both keys via
`isStructuralAOnly`, and now converge (both engines scope them in) rather than diverge.

**Result.** Default `a` byte-identical (84 files / 1211 passed / 11 skipped). Under
`MODEL=b` the whole live-animals suite is now 1211 passed / 0 failed — the last two
`MODEL=b` failures cleared. Oracle stays zero behavioural divergence; the raw-scope
D7/D8 test stays green.
