import { isKeyedRecord } from '../internal/is-keyed-record.js'

const singleImplication = (applicabilityDecision) =>
  applicabilityDecision ?? { inScope: true }

const groupImplication = (
  obligation,
  applicabilityDecision,
  fulfilmentIndexesByObligationId
) => {
  const implication = {
    inScope: true,
    fulfilmentIndexes: [
      ...(fulfilmentIndexesByObligationId.get(obligation.id) ?? [])
    ]
  }
  if (applicabilityDecision?.reasons) {
    implication.reasons = applicabilityDecision.reasons
  }
  return implication
}

// Two shapes land here:
//   1. Group-scoped field record (`within` set) — enumerate the parent
//      group's instance-paths as the leaf's fulfilmentIndexes. Status is
//      read from `obligation.status` by consumers (via `effectiveStatus`);
//      it is not stamped onto the implication.
//   2. Top-level scalar (no `within`) — the natural data-only shape for
//      an always-in-scope obligation. No fulfilmentIndexes; consumers read
//      status from the obligation directly.
const fieldImplication = (obligation, fulfilmentIndexesByObligationId) => {
  if (!obligation.within) {
    return { inScope: true, status: obligation.status }
  }
  return {
    inScope: true,
    status: obligation.status,
    fulfilmentIndexes: [
      ...(fulfilmentIndexesByObligationId.get(obligation.within.id) ?? [])
    ]
  }
}

// Id set comes from applyTo — the authoritative "what fulfilmentIndexes CAN
// exist". Storage tracks which ones have VALUES.
const derivedLeafImplication = (obligation, applicabilityDecision) => {
  const implication = {
    inScope: true,
    status: obligation.status,
    fulfilmentIndexes: applicabilityDecision?.fulfilmentIndexes ?? []
  }
  if (applicabilityDecision?.reasons) {
    implication.reasons = applicabilityDecision.reasons
  }
  return implication
}

// FulfilmentIndex presence via storage keys.
const userLeafImplication = (
  obligation,
  applicabilityDecision,
  amendedFulfilments
) => {
  const fulfilment = amendedFulfilments[obligation.id]
  const implication = {
    inScope: true,
    status: obligation.status,
    fulfilmentIndexes: isKeyedRecord(fulfilment) ? Object.keys(fulfilment) : []
  }
  if (applicabilityDecision?.reasons) {
    implication.reasons = applicabilityDecision.reasons
  }
  return implication
}

// Build one obligation's implication given the evaluate-call context.
//
// Returns `{ inScope: false }` if the obligation is out of scope.
// Otherwise returns the category-specific implication.
export function buildImplication(obligation, context) {
  const {
    isInScope,
    obligationsByCategory,
    applicabilityDecisions,
    fulfilmentIndexesByObligationId,
    amendedFulfilments
  } = context

  if (!isInScope(obligation)) {
    return { inScope: false }
  }

  const category = obligationsByCategory.get(obligation.id)
  const applicabilityDecision = applicabilityDecisions.get(obligation.id)

  switch (category) {
    case 'single':
      return singleImplication(applicabilityDecision)
    case 'group':
      return groupImplication(
        obligation,
        applicabilityDecision,
        fulfilmentIndexesByObligationId
      )
    case 'field':
      return fieldImplication(obligation, fulfilmentIndexesByObligationId)
    case 'derived-leaf':
      return derivedLeafImplication(obligation, applicabilityDecision)
    case 'user-leaf':
      return userLeafImplication(
        obligation,
        applicabilityDecision,
        amendedFulfilments
      )
    default:
      return { inScope: true }
  }
}
