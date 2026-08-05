// Transitive descendants (excluding self).
export function buildDescendants(obligations, obligationChildren) {
  const obligationDescendants = new Map()
  for (const obligation of obligations) {
    const acc = []
    const stack = [...(obligationChildren.get(obligation.id) ?? [])]
    while (stack.length) {
      const child = stack.pop()
      acc.push(child)
      for (const grandchild of obligationChildren.get(child.id) ?? []) {
        stack.push(grandchild)
      }
    }
    obligationDescendants.set(obligation.id, acc)
  }
  return obligationDescendants
}
