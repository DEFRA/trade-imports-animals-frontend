import { deriveGroupFulfilmentIndexes } from '../internal/derive-group-fulfilment-indexes.js'

// Pre-purge enumeration of group fulfilmentIndexes from raw storage.
// No `isInScope` filter (scope hasn't been decided yet), so every group
// with descendant storage contributes its fulfilmentIndex set.
// Returns `Map<groupId, string[]>`.
export function enumerateGroupPathsFromStorage(
  obligations,
  obligationsByCategory,
  obligationAncestorGroups,
  obligationDescendants,
  fulfilments
) {
  const paths = new Map()
  for (const obligation of obligations) {
    if (obligationsByCategory.get(obligation.id) !== 'group') {
      continue
    }
    const ids = deriveGroupFulfilmentIndexes(
      obligation,
      obligationAncestorGroups,
      obligationDescendants,
      (descendant) => fulfilments[descendant.id]
    )
    paths.set(obligation.id, [...ids])
  }
  return paths
}
