// Classify each obligation into one of the categories used by the
// pipeline branches. Under the applyTo + helpers model:
//   'derived-leaf' — indexed leaf with imperative scope: either
//                    `indexedBy.source === 'derived'`, OR `applyTo`
//                    present alongside `within` (leaf inside a group).
//                    In both shapes purge filters records by
//                    applyTo's `records` set.
//   'user-leaf'    — indexedBy present, non-derived source (ids from
//                    own storage).
//   'field'        — has `status`, no `applyTo`, no `indexedBy`
//                    (always-in-scope-for-parent-group leaf).
//   'group'        — has children via `within` back-refs.
//   'single'       — otherwise (scalar leaf value at fulfilments[o.id]).
const categoryOf = (obligation, obligationChildren) => {
  if (obligation.indexedBy) {
    return obligation.indexedBy.source === 'derived'
      ? 'derived-leaf'
      : 'user-leaf'
  }
  if (obligation.applyTo && obligation.within) return 'derived-leaf'
  if (obligation.status !== undefined && !obligation.applyTo) return 'field'
  if (obligationChildren.has(obligation.id)) return 'group'
  return 'single'
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
