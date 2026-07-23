# The engine

The prototype has one obligation model and derives everything a page shows —
scope, status, navigation, the wipe set — from it. This page describes the
runtime that does that derivation: the pure evaluator, the state queries
layered over its output, the bridge seam that projects that output into the
shapes controllers consume, and the hapi-facing barrel a page controller
actually imports.

See the [docs index](README.md) for the surrounding guides. The obligation
manifest itself is covered in [obligation-model.md](obligation-model.md); the
scope and wipe grammar in [scope-and-wipe.md](scope-and-wipe.md); durable
storage in [persistence.md](persistence.md).

## One model, one door

```
model/obligations/evaluator.js       the pure evaluator over flat fulfilments
model/obligations/state-queries.js   pure queries: mandates, group invariants
bridge/                              the seam — runs the evaluator, projects its output
engine/index.js                      the hapi barrel a page controller imports
```

- **`model/`** is pure. No `request`/`h`, no I/O, no imports from `flow/` or
  `features/`. The evaluator takes a flat `fulfilments` map and returns an
  implication per obligation; `model/obligations/state-queries.js` reads that
  output and answers one specific question (is this record mandatory here,
  which group invariants are unmet).
- **`engine/`** is the hapi side: session, records, and the read/write surface
  a page controller sees. It never touches the evaluator directly — it reaches
  the model **through the bridges** in `bridge/`.

A page controller imports exactly one barrel, `engine/index.js`, and gets a
narrow one-directional surface: read scope and status up, write answers down.

## The pure evaluator

`model/obligations/evaluator.js` exports
`createObligationEvaluator({ obligations })`, which returns
`{ evaluate(fulfilments) }`. It is constructed once and every `evaluate` call
is pure and synchronous. Construction pre-computes read-only indexes of the
manifest (`buildObligationsById`, `buildObligationChildren`, `classifyObligations`,
`buildAncestorGroups`, `buildDescendants`).

**The contract:**

```
evaluate(fulfilments) → { fulfilments, obligations }
```

- `fulfilments` in is the **flat storage map** keyed by obligation UUID. A
  grouped value is a **records-map** `{ fulfilmentId: value }`, where the
  fulfilmentId is a `/`-delimited composite key (`line0`, `line0/unit1`).
- `fulfilments` out is the **post-purge, amended** view — the same map with
  out-of-scope entries dropped and unknown obligation ids removed.
- `obligations` out is `implicationsByObligation` — one implication per
  obligation, shape `{ inScope, status?, reasons?, records? }`.

### The four steps

Each `evaluate` call runs:

1. **`dropUnknownFulfilments`** — drop any stored value whose obligation id is
   not in the current manifest. Tolerate-and-amend: an unknown id never throws.
2. **`convergePurge`** — the fixpoint that resolves scope and purges storage
   (below).
3. **`enumerateGroupFulfilmentIds`** — after purge, scan each group's
   descendants' composite keys to list the group's surviving instance ids.
4. **`buildImplications`** — build one implication per obligation from the
   converged scope, decisions and group ids.

### convergePurge — the fixpoint

Scope and purge are computed together in a fixpoint loop rather than one pass.
Each iteration works on the current view of storage:

- **enumerate** group instance-paths from the current view
  (`enumerateGroupPathsFromStorage`),
- **decide** — run every obligation's `applyTo(fulfilments, fulfilmentIdsByObligationId)`
  (`runApplicabilityDecisions`),
- **check** — build `makeInScopeCheck`: an obligation is effectively in scope
  only when its own `applyTo` says so **and** every ancestor group is in scope
  (memoised),
- **purge** — drop everything out of scope (`purgeStorage`),

then compare the purged view with the one it started from (`viewsEqual`). When
they match, the loop returns. It is bounded by `MAX_PURGE_ITERATIONS` (16) and
throws if it exceeds the cap.

Why a fixpoint. Every `applyTo` is exercised against the same post-purge view
that every other gate sees. A value this call is purging cannot silently drive
another obligation's gate. `purgeStorage` only ever removes storage — it is
monotonic — so real manifests converge in one or two iterations; the throw
catches a pathological gate that oscillates rather than truncating at some
arbitrary iteration.

**`purgeStorage` rules**, by obligation category:

- out of scope → drop the whole entry.
- `derived-leaf` → keep only the records whose fulfilmentId is in the set the
  obligation's `applyTo` authorises (its `records`).

  A projecting gate admits a record by a true path-prefix match — `key === ''`
  (a scalar gate authorises everything), `path === key`, or
  `path.startsWith(key + '/')` — so a gate nested inside a depth-2 group still
  admits its deeper records. The empty-string branch is load-bearing: a naive
  `startsWith` alone would stop scalar gates authorising any record, and a
  first-segment-only match would silently destroy the stored records of any
  gate below depth 1. Pinned by `model/obligations/path-prefix-depth.test.js`, whose
  negative control stops the match being satisfied by admitting everything.

- `single` scalar → keep as-is.
- keyed record (a `field` record or user-driven leaf) → keep when non-empty.

### The obligation categories

`classifyObligations` sorts each obligation into the category that drives its
purge and implication branches:

- **`single`** — a scalar leaf stored at `fulfilments[o.id]`.
- **`field`** — has a `status`, no `applyTo`: an always-in-scope leaf under its
  parent group (or a top-level scalar with an intrinsic status).
- **`group`** — has children via `within` back-references.
- **`derived-leaf`** — a leaf with imperative scope: `applyTo` alongside
  `within` (or a derived `indexedBy` source). Purge filters its records to the
  `applyTo`-authorised set.
- **`user-leaf`** — an indexed leaf whose record ids come from its own storage.

### buildImplication

`buildImplication(obligation, context)` produces one obligation's implication:

- out of scope → `{ inScope: false }`.
- **`single`** → the `applyTo` decision, or `{ inScope: true }`.
- **`group`** → `{ inScope: true, reasons?, records: [{ fulfilmentId }] }` —
  one record per surviving instance.
- **`field`** → a top-level scalar returns `{ inScope: true, status }`
  directly; a grouped field stamps `obligation.status` onto each parent-group
  instance record.
- **`derived-leaf`** → `records` come from the `applyTo` set (what records
  _can_ exist), each stamped with `status`.
- **`user-leaf`** → `records` come from the obligation's own post-purge storage
  keys (what records _have values_).

The implication is the single value every downstream primitive reads. It
carries scope (`inScope`), the per-record or per-obligation mandate (`status`
= `mandatory` | `optional`), any failure `reasons`, and the record membership
(`records[].fulfilmentId`).

## State queries

`model/obligations/state-queries.js` is a set of pure functions over `state` —
exactly the `{ fulfilments, obligations }` that `evaluate` returns. No
evaluator state is kept between calls; each query stands alone.

- **`effectiveStatus(obligation, path, state)`** returns the per-record or
  per-obligation mandate (`mandatory` / `optional`), reading `impl.records` for
  grouped leaves and the top-level `status` for singletons.
- **`groupInvariantErrors(group, state)`** emits one error per unmet rule on a
  group's `requires`:
  - **`minEntries`** — a collection floor. One `MIN_ENTRIES` error when the
    group has fewer records than the floor. This is what stops an empty
    consignment reading as fulfilled.
  - **`maxEntries`** — a collection cap, symmetric to the floor.
  - **`anyOfIds`** — a per-instance rule. One error per in-scope instance
    where none of the listed leaves is filled (and at least one is in scope).
    This carries the "at least one identifier per unit" rule.
  - **`allOrNothingOfIds`** — a scalar field-block rule. One error when the
    block is partially filled; none when all-blank or all-filled.
  - **`recordCountEquals`** — a per-parent-instance count check. One error per
    parent whose child-record count differs from the declared count field.

The 5-way task and section status (`not-applicable` / `optional` /
`not-started` / `in-progress` / `fulfilled`) is classified in the bridge —
`status.js` below — from these queries plus the domain's completeness rules.
`submitted` is a user-driven event owned by the journey engine, not a derived
status.

## The bridge seam

Controllers speak in nested `answers` and pathKeys; the evaluator speaks in
flat `fulfilments` and composite keys. `bridge/` is the only place the
two meet. Each bridge instantiates its own `createObligationEvaluator()`, runs
`answersToFulfilments(answers)` through it, and projects the output back into
the shape controllers consume.

- **`fulfilments.js`** — the translator. `answersToFulfilments` /
  `fulfilmentsToAnswers` convert nested answers to and from the flat map, with
  composite-key ↔ positional-path conversion (`ancestorChain`,
  `fulfilmentIdToPath`). Values cross unchanged — answers and the manifest's
  gates share one stored vocabulary — with one exception: the animal count is
  coerced from the page's HTTP string to a number, because the model's count
  invariants compare numerically. Unparseable input passes through raw for the
  controller to reject; the bridge never destroys a value it cannot place.
- **`scope.js`** — `makeScopeFromB(answers)` returns
  `{ inScope: Set<pathKey>, has(id), answered(id), readyForCheckYourAnswers }`.
  It projects every in-scope implication back into the pathKey grammar (bare
  id, group-node key, positional leaf) and adds the flow-only obligations the
  obligation model does not carry (`importType`, `declaration`), so their pages
  stay reachable. `readyForCheckYourAnswers` comes from `readiness-config.js`.
- **`status.js`** — `statusOfFromB(parts, answers, inScope)` is the sole
  runtime source of the 5-way task and section status. It projects the manifest
  into a structural registry shape (`toStructural`) and reads completeness from
  the evaluator state — per-record scope from the implication's `records`,
  per-record mandate from `effectiveStatus`, fulfilment from the domain's
  `isComplete` / `isBlankValue`.
- **`purge.js`** — `wipeSetFromB(answers)` returns the pathKeys the evaluator's
  purge destroys: every leaf answered in the input but absent from the
  post-purge output. It feeds `lib/path.js`'s `destroyWiped`.
- **`collection-complete.js`** — `entryCompleteFromB` gives per-instance
  completeness for the collection views.

## The hapi barrel

`engine/index.js` is a pure barrel — it owns no logic and re-exports names
explicitly (never `export *`) so the facade cannot silently widen. A page
controller imports it as `import * as state` and sees exactly this:

| Direction      | Names                                                                                                                                        |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Read up        | `get`, `makeScope`                                                                                                                           |
| Write down     | `commit`, `appendEntry`/`appendEntryAt`, `updateEntry`/`updateEntryAt`, `removeEntry`/`removeEntryAt`, `reconcileEntriesAt`, `submitJourney` |
| Loop primitive | `collectionView`, `collectionCapAt`                                                                                                          |
| Constant       | `SUBMITTED`                                                                                                                                  |

Two deliberate absences define the shape. There is **no `setScope` and no
`delete(otherObligation)`** — scope is always derived and the wipe is always
applied by the engine, so a page can neither assert scope nor hand-roll a
wipe.

### The read side — `engine/read.js`

`makeScope(answers)` delegates straight to the bridge's `makeScopeFromB` —
scope is the evaluator's projection, nothing more. `get(request, h)` loads the
current journey and attaches its answers and scope for the controller.

### The write side — `engine/write.js`

- `commit` merges the incoming patch into the answers, **purges** by calling
  `destroyWiped(answers, wipeSetFromB(answers))`, saves, and returns the fresh
  scope. Every write runs the wipe, so answers can never drift out of scope.
- `appendEntryAt` respects `collectionCapAt` — an append past the cap returns
  `null`. `removeEntryAt` and `reconcileEntriesAt` purge after mutating.
- `submitJourney` gates on `scope.readyForCheckYourAnswers`; only when ready
  does it finalise the records port.

### The readiness seam

`readyForCheckYourAnswers` needs the boot-built dispatch index and the flow's
task-row list. `engine/readiness-config.js` statically defaults to
`flow/section-status.js`'s `readyForCheckYourAnswers`, and
`bridge/scope.js` reaches it through `computeReadyForCheckYourAnswers`.
`configureReadyForCheckYourAnswers` remains as a test override; runtime boot
does not configure readiness.

### store.js

`engine/store.js` is a small frozen facade over the records port (`create`,
`get`, `has`, `saveAnswers`, `submit`, `clear`). It is a test convenience only
— it is not part of the barrel and no controller imports it. New code imports
the ports directly (`engine/persistence/records.js`,
`engine/persistence/session.js`).
