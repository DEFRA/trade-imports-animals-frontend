import { isKeyedRecord } from '../internal/is-keyed-record.js'

// Top-level obligation stored directly at `state.fulfilments[obligation.id]`.
// Either an applyTo returned an applicability decision (which may carry
// flip-status such as `{ inScope: true, status: 'optional' }` from an
// `equalsGate` / `branchedGate`), or we fall through to the obligation's
// intrinsic status. Prior to Phase 1.4, top-level obligations with
// intrinsic status but no applyTo were classified as `'field'` and produced
// the same `{ inScope: true, status }` shape via a separate branch — that
// case now folds into `'unindexed'`.
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

// Group-scoped leaf with no conditional gate — enumerate the parent group's
// fulfilmentIndexes as this leaf's fulfilmentIndexes. One entry at every
// parent instance.
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

// FulfilmentIndex set comes from applyTo — the authoritative "what
// fulfilmentIndexes CAN exist". Storage tracks which ones have VALUES.
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

// FulfilmentIndex presence via the user's own indexedFulfilments keys.
const userStorageDerivedImplication = (
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
    case 'user-storage-derived':
      return userStorageDerivedImplication(
        obligation,
        applicabilityDecision,
        amendedFulfilments
      )
    default:
      return { inScope: true }
  }
}
