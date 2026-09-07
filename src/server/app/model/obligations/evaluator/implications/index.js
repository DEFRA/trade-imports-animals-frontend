import { isNonArrayObject } from '../../helper-internals.js'

// The five implication constructors below correspond to the five categories
// emitted by `classifyObligations`.

const unindexedImplication = (obligation, applicabilityDecision) => {
  if (applicabilityDecision) {
    return applicabilityDecision
  }
  if (obligation.status !== undefined) {
    return { inScope: true, status: obligation.status }
  }
  return { inScope: true }
}

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

// One fulfilmentIndex at every parent-group instance.
const parentDerivedImplication = (
  obligation,
  fulfilmentIndexesByObligationId
) => ({
  inScope: true,
  status: obligation.status,
  fulfilmentIndexes: [
    ...(fulfilmentIndexesByObligationId.get(obligation.within.id) ?? [])
  ]
})

// FulfilmentIndexes come from applyTo — the authoritative "what CAN exist".
// Storage tracks which of those have VALUES.
const applyToDerivedImplication = (obligation, applicabilityDecision) => {
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

// FulfilmentIndexes come directly from the user's inputs — the keys of
// the obligation's indexedFulfilments map.
const userInputDerivedImplication = (
  obligation,
  applicabilityDecision,
  amendedFulfilments
) => {
  const fulfilment = amendedFulfilments[obligation.id]
  const implication = {
    inScope: true,
    status: obligation.status,
    fulfilmentIndexes: isNonArrayObject(fulfilment)
      ? Object.keys(fulfilment)
      : []
  }
  if (applicabilityDecision?.reasons) {
    implication.reasons = applicabilityDecision.reasons
  }
  return implication
}

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

  const obligationCategory = obligationsByCategory.get(obligation.id)
  const applicabilityDecision = applicabilityDecisions.get(obligation.id)

  switch (obligationCategory) {
    case 'unindexed':
      return unindexedImplication(obligation, applicabilityDecision)
    case 'group':
      return groupImplication(
        obligation,
        applicabilityDecision,
        fulfilmentIndexesByObligationId
      )
    case 'parent-derived':
      return parentDerivedImplication(
        obligation,
        fulfilmentIndexesByObligationId
      )
    case 'apply-to-derived':
      return applyToDerivedImplication(obligation, applicabilityDecision)
    case 'user-input-derived':
      return userInputDerivedImplication(
        obligation,
        applicabilityDecision,
        amendedFulfilments
      )
    default:
      return { inScope: true }
  }
}
