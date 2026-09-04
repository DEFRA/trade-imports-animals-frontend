import { deriveGroupFulfilmentIndexes } from '../internal/derive-group-fulfilment-indexes.js'

// Step 2: pre-purge enumeration of group fulfilmentIndexes from raw
// storage. Same shape as `enumerateGroupFulfilmentIndexesPostPurge`
// (step 6) but without an `isInScope` filter — pre-purge, so no scope
// decisions have been made yet.
//
// Returns `Map<groupId, string[]>`. Groups without any descendant
// storage get an empty array.
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
