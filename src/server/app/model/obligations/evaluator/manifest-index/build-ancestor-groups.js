// Ancestor groups from root down to immediate parent (excluding self).
export function buildAncestorGroups(obligations) {
  const obligationAncestorGroups = new Map()
  for (const obligation of obligations) {
    const ancestorGroups = []
    let ancestor = obligation.within
    while (ancestor) {
      ancestorGroups.unshift(ancestor)
      ancestor = ancestor.within
    }
    obligationAncestorGroups.set(obligation.id, ancestorGroups)
  }
  return obligationAncestorGroups
}
