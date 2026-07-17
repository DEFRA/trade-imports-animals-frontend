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
