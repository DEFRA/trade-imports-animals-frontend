// Transitive descendants (excluding self). DFS via a LIFO worklist.
export function buildDescendants(obligations, obligationChildren) {
  const obligationDescendants = new Map()
  for (const obligation of obligations) {
    const descendants = []
    const pendingDescendants = [
      ...(obligationChildren.get(obligation.id) ?? [])
    ]
    while (pendingDescendants.length) {
      const child = pendingDescendants.pop()
      descendants.push(child)
      for (const grandchild of obligationChildren.get(child.id) ?? []) {
        pendingDescendants.push(grandchild)
      }
    }
    obligationDescendants.set(obligation.id, descendants)
  }
  return obligationDescendants
}
