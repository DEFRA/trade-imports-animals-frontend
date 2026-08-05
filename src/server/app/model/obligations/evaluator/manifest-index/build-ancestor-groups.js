// Ancestor groups from root down to immediate parent (excluding self).
export function buildAncestorGroups(obligations) {
  const obligationAncestorGroups = new Map()
  for (const obligation of obligations) {
    const chain = []
    let cur = obligation.within
    while (cur) {
      chain.unshift(cur)
      cur = cur.within
    }
    obligationAncestorGroups.set(obligation.id, chain)
  }
  return obligationAncestorGroups
}
