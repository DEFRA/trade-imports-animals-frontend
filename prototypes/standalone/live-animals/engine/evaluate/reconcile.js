import { walk } from '../../registry.js'
import { evalPredicate } from './predicate.js'
import { isAnswered } from '../../lib/answered.js'
import { isStrictPathPrefix, pathKey, valueAt } from '../../lib/path.js'

/**
 * `reconcile(answers) -> { inScope: Set<pathKey>, wiped: [pathKey] }` — pure,
 * zero I/O. `forest` is a test-only seam: it defaults to the real registry, so
 * production callers pass answers alone; the synthetic cross-frame scope+wipe
 * specs inject a hand-built obligation forest here (see reconcile.test.js).
 */
export function reconcile(answers, forest) {
  // Structure depends only on the answers (array lengths), not on scope, so
  // the walk is projected ONCE before the fixpoint.
  const nodes = [...walk(answers, forest)]

  const inScope = new Set()
  let changed = true
  while (changed) {
    changed = false
    for (const { path, obligation, collectionAncestorKey, frames } of nodes) {
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
        evalPredicate(obligation.activatedBy, answers, frames)
      ) {
        inScope.add(key)
        changed = true
      }
    }
  }

  // The caller DELETES these paths — data is destroyed, not hidden, so
  // re-entering scope starts blank (the Yes-No-Yes invariant).
  const wipedPaths = nodes
    .filter(
      ({ path, obligation }) =>
        obligation.wipeOnExit &&
        !inScope.has(pathKey(path)) &&
        isAnswered(valueAt(answers, path))
    )
    .map(({ path }) => path)

  // A wiped collection root deletes its whole subtree, so descendant paths are
  // deduped away — array-segment prefix, never string prefix.
  const wiped = wipedPaths
    .filter(
      (path) => !wipedPaths.some((other) => isStrictPathPrefix(other, path))
    )
    .map(pathKey)

  return { inScope, wiped }
}
