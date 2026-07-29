import { groupInstancePaths } from '../internal/group-instance-paths.js'

// Step 6: enumerate each group's instance ids by scanning descendants'
// composite-key prefixes on POST-purge storage.
//
// A group's instance fulfilmentId is the first N segments of any
// descendant leaf's composite fulfilmentId, where N =
// ancestorGroups.length + 1. Union across all descendants. Out-of-
// scope groups map to an empty Set.
//
// Returns `Map<group obligation id, Set<group fulfilmentId>>`.
export function enumerateGroupFulfilmentIds(obligations, context) {
  const {
    obligationsByCategory,
    obligationAncestorGroups,
    obligationDescendants,
    isInScope,
    amendedFulfilments
  } = context

  const fulfilmentIdsByObligationId = new Map()
  for (const obligation of obligations) {
    if (obligationsByCategory.get(obligation.id) !== 'group') continue
    if (!isInScope(obligation)) {
      fulfilmentIdsByObligationId.set(obligation.id, new Set())
      continue
    }
    const ids = groupInstancePaths(
      obligation,
      obligationAncestorGroups,
      obligationDescendants,
      (desc) => amendedFulfilments[desc.id]
    )
    fulfilmentIdsByObligationId.set(obligation.id, ids)
  }
  return fulfilmentIdsByObligationId
}
