import { walk } from '../registry.js'
import { evalPredicate } from './predicate.js'
import { isAnswered } from './util.js'
import { isStrictPathPrefix, pathKey, valueAt } from '../lib/path.js'

/**
 * THE pure state evaluator — the single home of activation + scope-exit
 * wipe (v1's two evaluators collapsed into one), now PATH-ADDRESSED so it
 * descends into indexed collections (DISCUSSION-LOG entry 6a).
 *
 * `reconcile(answers) -> { inScope:Set<pathKey>, wiped:[pathKey] }`:
 *  - It walks the per-INSTANCE catalogue (`registry.walk`) once — the tree
 *    materialised against these answers — so a two-claim collection presents
 *    `claims`, `claims[0].claimType`, `claims[1].claimType`, … as distinct
 *    obligation instances. Structure depends only on the answers (array
 *    lengths), not on scope, so the walk is projected ONCE before the fixpoint.
 *  - inScope is computed to a FIXPOINT over the activation graph, keyed by
 *    `pathKey`. A sub-obligation is only reachable once its enclosing
 *    collection instance is itself in scope. A DEPTH-0 path collapses to the
 *    bare id, so every scalar `scope.has('claims')` is byte-identical to before.
 *  - wiped names every `wipeOnExit` instance now OUT of scope but still holding
 *    data. A wiped collection root deletes its whole subtree, so descendant
 *    paths are deduped away (array-segment prefix, never string prefix). The
 *    caller (store.commit) DELETES those paths — data is destroyed, not hidden,
 *    so re-entering scope starts blank (the Yes-No-Yes invariant, at any depth).
 *
 * Pure and zero-I/O: nothing here reads or writes the store.
 */
export function reconcile(answers) {
  const nodes = [...walk(answers)]

  const inScope = new Set()
  let changed = true
  while (changed) {
    changed = false
    for (const {
      path,
      obligation,
      collectionAncestorKey,
      framePath,
      siblings
    } of nodes) {
      const key = pathKey(path)
      if (inScope.has(key)) continue
      if (
        collectionAncestorKey !== null &&
        !inScope.has(collectionAncestorKey)
      ) {
        continue
      }
      if (
        !obligation.activatedBy ||
        evalPredicate(obligation.activatedBy, answers, framePath, siblings)
      ) {
        inScope.add(key)
        changed = true
      }
    }
  }

  const wipedPaths = nodes
    .filter(
      ({ path, obligation }) =>
        obligation.wipeOnExit &&
        !inScope.has(pathKey(path)) &&
        isAnswered(valueAt(answers, path))
    )
    .map(({ path }) => path)

  const wiped = wipedPaths
    .filter(
      (path) => !wipedPaths.some((other) => isStrictPathPrefix(other, path))
    )
    .map(pathKey)

  return { inScope, wiped }
}
