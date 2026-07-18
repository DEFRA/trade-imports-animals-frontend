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
