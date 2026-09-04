import { deriveGroupFulfilmentIndexes } from '../internal/derive-group-fulfilment-indexes.js'

// Step 6: enumerate each group's fulfilmentIndexes by scanning
// descendants' indexedFulfilments keys on POST-purge storage.
//
// A group's fulfilmentIndex is the first N segments of any descendant
// leaf's fulfilmentIndex, where N = ancestorGroups.length + 1. Union
// across all descendants. Out-of-scope groups map to an empty Set.
//
// Returns `Map<group obligation id, Set<group fulfilmentIndex>>`.
export function enumerateGroupFulfilmentIndexesPostPurge(obligations, context) {
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
      ? deriveGroupFulfilmentIndexes(
          obligation,
          obligationAncestorGroups,
          obligationDescendants,
          (descendant) => amendedFulfilments[descendant.id]
        )
      : new Set()
    fulfilmentIndexesByObligationId.set(obligation.id, ids)
  }
  return fulfilmentIndexesByObligationId
}
