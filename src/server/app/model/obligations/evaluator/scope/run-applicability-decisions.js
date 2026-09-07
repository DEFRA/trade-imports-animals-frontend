// Evaluate each obligation's applyTo (if it has one).
// `applyTo(fulfilments, fulfilmentIndexesByObligationId)` — the second
// arg is the group-fulfilmentIndex map produced by
// `enumerateGroupPathsFromStorage`.
//
// Returns `Map<obligationId, applyTo return>`.
export function runApplicabilityDecisions(
  obligations,
  recognisedFulfilments,
  fulfilmentIndexesByObligationId = new Map()
) {
  const applicabilityDecisions = new Map()
  for (const obligation of obligations) {
    if (obligation.applyTo) {
      applicabilityDecisions.set(
        obligation.id,
        obligation.applyTo(
          recognisedFulfilments,
          fulfilmentIndexesByObligationId
        )
      )
    }
  }
  return applicabilityDecisions
}
