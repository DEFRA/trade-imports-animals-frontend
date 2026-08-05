// Step 4: build a memoised effective-inScope predicate.
//
// `isInScope(obligation) → boolean` ANDs the obligation's own applyTo
// inScope with every ancestor group's inScope. Results are cached
// inside the closure across calls; the caller can optionally warm
// the cache by invoking it for every obligation up front.
export function makeInScopeCheck(
  obligationApplicabilityDecisions,
  obligationAncestorGroups
) {
  const inScopeCache = new Map()
  const isInScope = (obligation) => {
    if (inScopeCache.has(obligation.id)) {
      return inScopeCache.get(obligation.id)
    }
    const own = obligationApplicabilityDecisions.get(obligation.id)
    if (own?.inScope === false) {
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
