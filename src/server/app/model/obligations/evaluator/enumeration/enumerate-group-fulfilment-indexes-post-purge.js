import { deriveGroupFulfilmentIndexes } from '../internal/derive-group-fulfilment-indexes.js'

// Post-purge enumeration of group fulfilmentIndexes. Applies the
// `isInScope` filter so out-of-scope groups map to an empty Set.
// Returns `Map<groupId, Set<fulfilmentIndex>>`.
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
