# Scope and wipe

Scope is the set of obligations the journey currently owes, derived from the
answers alone. This file explains how scope is computed, how out-of-scope
values are purged, how paths address nested instances, why leaving scope
destroys data, and who consumes the result.

The code:

- `model/obligations/evaluator.js` — the obligation evaluator (`convergePurge`,
  the purge fixpoint).
- `bridge/scope.js` — `makeScopeFromB`, which projects the evaluator's
  in-scope implications into the pathKey grammar the controllers read.
- `bridge/purge.js` — `wipeSetFromB`, which projects the evaluator's
  purge into the answer paths to destroy.
- `engine/read.js` — `makeScope`, the read surface.
- `engine/write.js` — `commit`, `removeEntryAt`, `reconcileEntriesAt`, which
  apply the purge on every write.
- `lib/path.js` — path maths and `destroyWiped`.

## Where scope comes from

Scope is a projection of the obligation evaluator's output.

`makeScope(answers)` in `engine/read.js` delegates to `makeScopeFromB` in
`bridge/scope.js`. That function:

1. Converts the nested answers POJO to the flat, composite-key `fulfilments`
   map with `answersToFulfilments` (`bridge/fulfilments.js`).
2. Runs `evaluator.evaluate(fulfilments)`. The evaluator returns
   `{ fulfilments, obligations }`, where `obligations` is the
   per-obligation implications map (`{ inScope, status?, records?, reasons? }`).
3. Projects every in-scope implication back into the answer pathKey grammar.

`makeScope` returns a scope object with four members:

- `inScope` — a `Set` of path keys naming every in-scope obligation instance.
- `has(id)` — membership test against `inScope`.
- `answered(id)` — whether any instance of the obligation holds a value.
- `readyForCheckYourAnswers` — the submit-readiness roll-up.

`makeScope` is pure over its `answers` argument and runs on every request.
Nothing derived is stored (see [Nothing derived is stored](#nothing-derived-is-stored)).

## What lands in `inScope`

`makeScopeFromB` adds one path key per in-scope obligation instance, in three
shapes:

- **Bare top-level ids** — `'countryOfOrigin'`, a scalar obligation in scope.
- **Group obligation node keys** — `'commodityLines'` (depth-0 group) or
  `'commodityLines[0].animalIdentifiers'` (a nested group, keyed once per
  parent-group instance).
- **Positional leaf paths** — `'commodityLines[0].commoditySelection'`,
  `'commodityLines[0].animalIdentifiers[1].animalIdentifierPassport'`.

Grouped obligations resolve their instances from the evaluator's `records`
arrays: each record carries a composite `fulfilmentId` (`line0`,
`line0/unit1`), which `fulfilmentIdToPath` converts to the positional path.
A group node is keyed once per parent instance, derived from the parent's
records — so a parent whose nested group is empty still contributes its node
key.

Two flow obligations the model does not evaluate — `importType` (the
pre-journey import-type filter) and `declaration` (the submit-time
declaration) — are always-in-scope, top-level, and added to the full scope by
`projectAOnlyFlowScope` so their owning pages stay reachable. The raw
evaluator scope (`rawInScopeFromB`) excludes them; the controllers consume the
full scope that includes them.

## Path vocabulary

An obligation instance is addressed by a path array that mixes ids and
indices: `['commodityLines', 0, 'commoditySelection']`. `pathKey` in
`lib/path.js` stringifies it to a stable key —
`commodityLines[0].commoditySelection` — and `parsePath` inverts it. These
keys are the identity used by scope, wipe and the answers map alike.

**The depth-0 collapse.** A single-segment path stringifies to the bare id:
`pathKey(['commodityLines'])` is `'commodityLines'`, not `'commodityLines[0]'`
or anything bracketed. This keeps every scalar lookup simple —
`scope.has('commodityLines')` and `scope.has('countryOfOrigin')` read the same
way. Only genuinely nested instances pick up the bracketed form.

## The Yes-No-Yes invariant

Answer yes, fill in the revealed data, then change the answer to no: the
dependent data is destroyed, not hidden. Change the answer back to yes and the
journey starts blank. This holds at any depth — a top-level field, an entry in
a collection, or a field inside a nested entry.

Destruction is deliberate. Hidden-but-kept data resurfaces in submitted
records, contradicts what the user last saw, and leaks answers the current
journey never asked for.

Three layers enforce it, and no single layer can be bypassed:

1. **The evaluator derives.** `convergePurge` in
   `model/obligations/evaluator.js` decides what leaves scope; `wipeSetFromB`
   in `bridge/purge.js` names the answer paths to destroy. Neither
   touches the session — they compute a list.
2. **Write applies.** `commit`, `removeEntryAt` and `reconcileEntriesAt` in
   `engine/write.js` call `destroyWiped` with that list on every write. The
   write surface has no `setScope` and no per-obligation `delete`, so a page
   cannot hand-roll a wipe or fake scope.
3. **The records port cannot express a partial delete.** The persistence port
   (`engine/persistence/records.js`) offers only whole-map `saveAnswers` —
   there is no delete-a-key surface. Even code holding the port directly
   cannot wipe one obligation by hand.

## How purge works

Two stages compute the wipe, then one stage applies it.

**Stage 1 — the evaluator converges on the surviving fulfilments.**
`evaluate(fulfilments)` runs `convergePurge`, a bounded fixpoint loop
(`MAX_PURGE_ITERATIONS = 16`, throws on non-convergence). Each iteration:

1. Enumerates group instance-paths from the current storage view.
2. Runs every obligation's `applyTo` against that view.
3. Computes effective in-scope — an obligation is in scope only if its own
   `applyTo` passes AND every ancestor group is in scope.
4. Purges storage: out-of-scope obligations drop their whole entry; a derived
   leaf keeps only the records its `applyTo` authorises.

The loop replaces the view with the just-purged fulfilments and repeats until
the view stops changing. Because every `applyTo` sees the same post-purge view,
a value this evaluation is purging can never silently drive another gate.
`purgeStorage` only ever drops keys, so convergence is monotonic and typically
lands in one or two iterations.

**Stage 2 — the bridge names the answer paths destroyed.** `wipeSetFromB`
(`bridge/purge.js`) runs the same evaluation, then diffs the input
fulfilments against the converged output:

```
fIn  = answersToFulfilments(answers)
fOut = evaluate(fIn).fulfilments
for each non-group leaf obligation answered in fIn but absent from fOut,
  emit its answer pathKey.
```

For a top-level scalar the emitted key is the bare id; for a grouped leaf it is
the positional path of each dropped record. Groups are skipped — dropping a
group's leaves destroys its data. The result is an array of answer pathKeys.

**Stage 3 — write destroys them.** `purge(answers)` in `engine/write.js` calls
`destroyWiped(answers, wipeSetFromB(answers))`. `destroyWiped` (`lib/path.js`)
parses each key, sorts them with `wipeOrder`, and deletes each in turn.
`wipeOrder` deletes a nested path before the shallower path that contains it,
and a higher array index before a lower sibling, so no delete ever shifts the
target of another. `destroyWiped` is the single home of scope-exit deletion,
shared by `commit`, `removeEntryAt` and `reconcileEntriesAt`.

## Appending never purges

`appendEntryAt` in `engine/write.js` skips the purge step. An append only adds
scope — it can activate new sub-obligation instances but can never deactivate
anything — so there is nothing to wipe. The asymmetry with `removeEntryAt`
(which does purge, because removing an entry can strand dependants) is
deliberate. `appendEntryAt` also caps the collection at `collectionCapAt`
(`engine/evaluate/cardinality.js`) and returns `null` at the cap.

## Who consumes scope

Gating pages is only one use of scope. The consumers all read the one
`makeScope` output, so they cannot disagree:

1. **Wipe** — `commit`, `removeEntryAt` and `reconcileEntriesAt`
   (`engine/write.js`) destroy the answer paths `wipeSetFromB` names.
2. **Submit-readiness** — `readyForCheckYourAnswers` on the scope object is the
   submit gate, consulted by `submitJourney` (`engine/write.js`) and the review
   section's authored gate (`flow/flow.js`). It is true once every answer
   section is fulfilled, not applicable or optional, judged against `inScope`
   (`flow/section-status.js`, the static default held by
   `engine/readiness-config.js`).
3. **Status** — `statusOfFromB` (`bridge/status.js`), reached through
   `rowStatus` (`flow/task-rows.js`), filters an obligation's instances to
   those in scope; none in scope means Not applicable.
4. **Navigation** — derived gates (`flow/gates.js`) pass when some collected
   obligation is in scope; `flow/navigation.js` skips pages whose gate fails.
5. **The reachability prover** — `analysis/flow-reachability.js` enumerates
   scope states and asserts every in-scope obligation has an owning, reachable
   page.

Controllers read the same set through `scope.has(id)`. Because every consumer
reads the one computation, a gated-out page's obligations are wiped, report Not
applicable, and are skipped by navigation, all from the same scope.

## Nothing derived is stored

The record persists answers and lifecycle metadata only — never scope, status
or wipe results. Every read rebuilds scope fresh: `makeScope`
(`engine/read.js`) runs the evaluator on the loaded answers, on every request.

This is why resume self-heals. A journey loaded later derives its scope from
the answers under the current model — there is no stale stored scope to
contradict them. See [persistence.md](persistence.md) for the resume flow and
the ports.
