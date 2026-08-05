// Immediate children per obligation, from `within` back-refs.
export function buildObligationChildren(obligations) {
  const obligationChildren = new Map()
  for (const obligation of obligations) {
    if (obligation.within) {
      const children = obligationChildren.get(obligation.within.id) ?? []
      children.push(obligation)
      obligationChildren.set(obligation.within.id, children)
    }
  }
  return obligationChildren
}
