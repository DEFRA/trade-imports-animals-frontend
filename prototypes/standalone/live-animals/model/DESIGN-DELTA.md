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
