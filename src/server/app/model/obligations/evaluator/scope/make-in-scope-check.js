// Build a memoised `isInScope(obligation) → boolean` — ANDs the obligation's
// own applyTo inScope with every ancestor group's inScope. Cached across
// calls via a closure-local Map.
export function makeInScopeCheck(
  applicabilityDecisions,
  obligationAncestorGroups
) {
  const inScopeCache = new Map()
  const isInScope = (obligation) => {
    if (inScopeCache.has(obligation.id)) {
      return inScopeCache.get(obligation.id)
    }
    const applicabilityDecision = applicabilityDecisions.get(obligation.id)
    if (applicabilityDecision?.inScope === false) {
      inScopeCache.set(obligation.id, false)
      return false
    }
    for (const ancestor of obligationAncestorGroups.get(obligation.id)) {
      if (!isInScope(ancestor)) {
        inScopeCache.set(obligation.id, false)
        return false
      }
    }
    inScopeCache.set(obligation.id, true)
    return true
  }
  return isInScope
}
