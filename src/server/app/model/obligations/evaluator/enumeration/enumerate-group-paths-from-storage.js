import { groupInstancePaths } from '../internal/group-instance-paths.js'

// Step 2: pre-purge enumeration of group instance-paths from raw
// storage. Same shape as `enumerateGroupFulfilmentIndexes` (step 6) but
// without an `isInScope` filter — pre-purge, so no scope decisions
// have been made yet.
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
    const ids = groupInstancePaths(
      obligation,
      obligationAncestorGroups,
      obligationDescendants,
      (desc) => fulfilments[desc.id]
    )
    paths.set(obligation.id, [...ids])
  }
  return paths
}
