import { walk } from '../../registry.js'
import { evalPredicate } from './predicate.js'
import { isAnswered } from '../../lib/answered.js'
import { isStrictPathPrefix, pathKey, valueAt } from '../../lib/path.js'

export function reconcile(answers, forest) {
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
