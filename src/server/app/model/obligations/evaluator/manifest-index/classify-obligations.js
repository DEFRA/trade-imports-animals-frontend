// The five categories emitted by `classifyObligations`, split on two axes —
// structural shape (`unindexed` vs `group`) and, for indexed leaves,
// enumeration provenance:
//
//   'unindexed'          — no fulfilmentIndex; stored directly at
//                          `state.fulfilments[obligation.id]`.
//   'group'              — has children via `within` back-refs;
//                          fulfilmentIndexes enumerated from descendants.
//   'parent-derived'     — indexed leaf whose fulfilmentIndexes come
//                          from the parent group's enumeration.
//   'user-input-derived' — indexed leaf whose fulfilmentIndexes come
//                          from the user's own inputs
//                          (`indexedBy.source !== 'derived'`).
//   'apply-to-derived'   — indexed leaf whose fulfilmentIndexes come
//                          from the applyTo gate's output.
const categoryOf = (obligation, obligationChildren) => {
  if (obligation.indexedBy) {
    return obligation.indexedBy.source === 'derived'
      ? 'apply-to-derived'
      : 'user-input-derived'
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
