// Classify each obligation into one of the five categories used by the
// pipeline branches. The taxonomy splits on two axes:
//   - structural shape: `unindexed` (one value, no fulfilmentIndex) vs
//     `group` (has children)
//   - enumeration provenance (indexed leaves only): where the leaf's
//     fulfilmentIndexes come from
//
//   'unindexed'             — top-level obligation whose fulfilment
//                             sits directly at
//                             `state.fulfilments[obligation.id]`. No
//                             fulfilmentIndex. Contrast with the three
//                             `-derived` categories, whose fulfilments
//                             live in `indexedFulfilments`.
//   'group'                 — has children via `within` back-refs.
//                             fulfilmentIndexes enumerated from
//                             descendants.
//   'parent-derived'        — indexed leaf whose fulfilmentIndexes come
//                             from the parent group's enumeration
//                             (one entry at every parent instance).
//   'user-storage-derived'  — indexed leaf whose fulfilmentIndexes
//                             come from the user's own storage keys
//                             (`indexedBy.source !== 'derived'`).
//   'apply-to-derived'      — indexed leaf whose fulfilmentIndexes
//                             come from the applyTo gate's output.
const categoryOf = (obligation, obligationChildren) => {
  if (obligation.indexedBy) {
    return obligation.indexedBy.source === 'derived'
      ? 'apply-to-derived'
      : 'user-storage-derived'
  }
  if (obligation.applyTo && obligation.within) {
    return 'apply-to-derived'
  }
  if (obligation.status !== undefined && !obligation.applyTo) {
    return obligation.within ? 'parent-derived' : 'unindexed'
  }
  if (obligationChildren.has(obligation.id)) {
    return 'group'
  }
  return 'unindexed'
}

export function classifyObligations(obligations, obligationChildren) {
  const obligationsByCategory = new Map()
  for (const obligation of obligations) {
    obligationsByCategory.set(
      obligation.id,
      categoryOf(obligation, obligationChildren)
    )
  }
  return obligationsByCategory
}
