// Step 3: evaluate each obligation's applyTo (if it has one).
// `applyTo(fulfilments, fulfilmentIndexesByObligationId)` — the second arg
// is the pre-purge group-paths map from step 2.
//
// Returns `Map<obligationId, applyTo return>`.
export function runApplicabilityDecisions(
  obligations,
  recognisedFulfilments,
  fulfilmentIndexesByObligationId = new Map()
) {
  const obligationApplicabilityDecisions = new Map()
  for (const obligation of obligations) {
    if (obligation.applyTo) {
      obligationApplicabilityDecisions.set(
        obligation.id,
        obligation.applyTo(
          recognisedFulfilments,
          fulfilmentIndexesByObligationId
        )
      )
    }
  }
  return obligationApplicabilityDecisions
}
