import { groupInstancePaths } from '../internal/group-instance-paths.js'

// Step 6: enumerate each group's instance fulfilment indexes by scanning
// descendants' record-map keys on POST-purge storage.
//
// A group's instance fulfilment index is the first N segments of any
// descendant leaf's fulfilment index, where N = ancestorGroups.length + 1.
// Union across all descendants. Out-of-scope groups map to an empty Set.
//
// Returns `Map<group obligation id, Set<group fulfilment index>>`.
export function enumerateGroupFulfilmentIndexes(obligations, context) {
  const {
    obligationsByCategory,
    obligationAncestorGroups,
    obligationDescendants,
    isInScope,
    amendedFulfilments
  } = context

  const fulfilmentIndexesByObligationId = new Map()
  const groupObligations = obligations.filter(
    (obligation) => obligationsByCategory.get(obligation.id) === 'group'
  )
  for (const obligation of groupObligations) {
    const ids = isInScope(obligation)
      ? groupInstancePaths(
          obligation,
          obligationAncestorGroups,
          obligationDescendants,
          (desc) => amendedFulfilments[desc.id]
        )
      : new Set()
    fulfilmentIndexesByObligationId.set(obligation.id, ids)
  }
  return fulfilmentIndexesByObligationId
}
