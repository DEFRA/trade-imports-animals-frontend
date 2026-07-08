# Scope, reconcile and wipe

Scope is the set of obligations the journey currently owes, derived from the
answers alone. This file explains how `reconcile` computes it, how paths
address nested instances, why leaving scope destroys data, and who consumes
the result.

The code: `engine/evaluate/reconcile.js` (derivation), `lib/path.js` (path
maths and `destroyWiped`), `engine/write.js` (application),
`engine/read.js` (the read surface).

## What reconcile does

`reconcile(answers)` returns `{ inScope, wiped }`:

- `inScope` — a `Set` of path keys naming every obligation instance the
  answers currently put in scope
- `wiped` — the path keys of every `wipeOnExit` instance that is now out of
  scope but still holds data

It is a pure function. It reads nothing but the answers map and writes
nothing.

The steps, as `engine/evaluate/reconcile.js` performs them:

1. **Materialise the per-instance catalogue once.** `registry.walk(answers)`
   yields one node per obligation instance — so a two-line commodities
   collection presents `commodityLines`,
   `commodityLines[0].commoditySelection` and
   `commodityLines[1].commoditySelection` as distinct instances. Structure
   depends only on the answers (array lengths), never on scope, so the walk
   is projected once, before the loop.
2. **Compute `inScope` to a fixpoint.** The loop keeps passing over the nodes
   until nothing changes. An instance enters scope when its `activatedBy`
   predicate passes (or it has none). Activation references can chain — an
   obligation activated by another obligation that is itself conditional —
   which is why a single pass is not enough.
3. **Gate sub-obligations on their enclosing collection.** Each node carries
   `collectionAncestorKey`, the path key of its nearest enclosing collection
   instance. A sub-obligation cannot enter scope until that collection
   instance is in scope, whatever its own predicate says.
4. **Name the wiped set.** An instance is wiped when it has `wipeOnExit`, is
   not in `inScope`, and still holds an answered value. Descendants of a
   wiped collection root are deduplicated away (see
   [wipe mechanics](#wipe-mechanics)).

Item-relative activation (a sub-obligation gated on a sibling field inside
the same entry) resolves through the `framePath` and `siblings` fields each
walked node carries. See `engine/evaluate/predicate.js`.

## Path vocabulary

An obligation instance is addressed by a path array that mixes ids and
indices: `['commodityLines', 0, 'commoditySelection']`. `pathKey` in
`lib/path.js` stringifies it to a stable key —
`commodityLines[0].commoditySelection` — and `parsePath` inverts it. These
keys are the identity used by scope, wipe and the answers map alike.

**The depth-0 collapse.** A single-segment path stringifies to the bare id:
`pathKey(['commodityLines'])` is `'commodityLines'`, not
`'commodityLines[0]'` or anything bracketed. This keeps every scalar lookup
unchanged — `scope.has('commodityLines')` and `scope.has('countryOfOrigin')`
work exactly as they did before scope was keyed by path. Only genuinely
nested instances pick up the bracketed form.

## The Yes-No-Yes invariant

Answer yes, fill in the revealed data, then change the answer to no: the
dependent data is destroyed, not hidden. Change the answer back to yes and
the journey starts blank. This holds at any depth — a top-level field, an
entry in a collection, or a field inside a nested entry.

Destruction is deliberate. Hidden-but-kept data resurfaces in submitted
records, contradicts what the user last saw, and leaks answers the current
journey never asked for.

Three layers enforce it, and no single layer can be bypassed:

1. **Reconcile derives.** `engine/evaluate/reconcile.js` is the only place
   that decides what is wiped. Its output names the paths; it deletes
   nothing itself.
2. **Write applies.** `commit` and `removeEntryAt` in `engine/write.js`
   call `destroyWiped` with the derived list on every write. The write
   surface deliberately has no `setScope` and no `delete(otherObligation)`,
   so a page cannot hand-roll a wipe or fake scope.
3. **The records port cannot express a partial delete.** The persistence
   port (`engine/persistence/records.js`) offers only whole-map
   `saveAnswers` — there is no delete-a-key surface. Even code holding the
   port directly cannot wipe one obligation by hand.

The short inline comments at those three sites each point at this section
for the joined-up story.

## Wipe mechanics

**Subtree roots only.** When a collection root is wiped, deleting it removes
its whole subtree. So `reconcile` deduplicates the wiped list: a path is
dropped when another wiped path is a strict prefix of it. The prefix test is
`isStrictPathPrefix` in `lib/path.js`, which compares path arrays segment by
segment. It is never a string prefix — `'documents'` must not match a
sibling key like `documentsExtra`, and `commodityLines[1]` must not match
`commodityLines[10]`.

**Delete ordering.** `destroyWiped` (`lib/path.js`) parses the keys and
sorts them with `wipeOrder` before deleting, because `deleteAt` splices
array indices and a splice renumbers later siblings:

- two sibling index deletes run highest index first
- a nested delete runs before the shallower delete of its container

With that ordering, no delete ever shifts the target of another.
`destroyWiped` is the single home of scope-exit deletion, shared by `commit`
and `removeEntryAt`.

**Appending never reconciles.** `appendEntryAt` in `engine/write.js` skips
the reconcile-and-wipe step. An append only adds scope — it can activate new
sub-obligation instances but can never deactivate anything — so there is
nothing to wipe. The asymmetry with `removeEntryAt` (which does reconcile,
because removing an entry can strand dependants) is deliberate.

## Who consumes scope

Gating pages is only one use of `inScope`. Five consumers read it:

1. **Wipe** — `commit` and `removeEntryAt` (`engine/write.js`) apply the
   `wiped` half of the same reconcile result via `destroyWiped`.
2. **Completeness roll-up** — `readyForCheckYourAnswers`
   (`flow/section-status.js`) is the submit-readiness gate (consulted by
   `submitJourney` and the review section's authored gate): true once every
   answer section is fulfilled, not applicable or optional, judged against
   `inScope`. (It iterates `answerSections`, which excludes the `review`
   section — see [flow-and-gates.md](flow-and-gates.md) for why.)
3. **Status** — `statusOf` (`engine/status.js`) filters a section's
   obligation ids to those in scope; none in scope means Not applicable.
4. **The reachability prover** — `analysis/reachability.js` reconciles a
   witness answers map per obligation instance and asserts the instance
   lands in scope before checking its owning page is reachable.
5. **Navigation** — derived gates (`flow/gates.js`) pass when some
   collected obligation is in scope; `sectionEntry` and `nextInSection`
   (`flow/navigation.js`) skip pages whose gate fails.

Controllers also read the same set through `scope.has(id)` on the object
`makeScope` returns. Because every consumer reads the one reconcile output,
they cannot disagree: a gated-out page's obligations are wiped, report Not
Applicable, and are skipped by navigation, all from the same computation.

## Nothing derived is ever stored

The record persists answers and lifecycle metadata only — never scope,
status or wipe results. Every read rebuilds scope fresh: `makeScope`
(`engine/read.js`) runs `reconcile` on the loaded answers, on every request.

This is why resume self-heals. A journey loaded days later, after the model
has changed, derives its scope from the answers under the current rules —
there is no stale stored scope to contradict them. See
[persistence.md](persistence.md) for the resume flow and the ports.
