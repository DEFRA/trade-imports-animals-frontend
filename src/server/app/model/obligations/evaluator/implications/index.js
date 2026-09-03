import { isKeyedRecord } from '../internal/is-keyed-record.js'

const singleImplication = (own) => own ?? { inScope: true }

const groupImplication = (obligation, own, fulfilmentIndexesByObligationId) => {
  const fulfilmentIndexes = [
    ...(fulfilmentIndexesByObligationId.get(obligation.id) ?? [])
  ]
  const implication = { inScope: true }
  if (own?.reasons) {
    implication.reasons = own.reasons
  }
  implication.records = fulfilmentIndexes.map((fulfilmentIndex) => ({
    fulfilmentIndex
  }))
  return implication
}

// Two shapes land here:
//   1. Group-scoped field record (`within` set) — enumerate the parent
//      group's instance-paths and stamp each one with `obligation.status`.
//   2. Top-level scalar with intrinsic status (no `within`) — the natural
//      data-only shape for an always-in-scope obligation. There is no
//      parent group to enumerate, so return the status directly,
//      mirroring what `applyTo: () => ({ inScope: true, status })` would
//      return.
const fieldImplication = (obligation, fulfilmentIndexesByObligationId) => {
  if (!obligation.within) {
    return { inScope: true, status: obligation.status }
  }
  const parentGroupFulfilmentIndexes = [
    ...(fulfilmentIndexesByObligationId.get(obligation.within.id) ?? [])
  ]
  return {
    inScope: true,
    records: parentGroupFulfilmentIndexes.map((fulfilmentIndex) => ({
      fulfilmentIndex,
      status: obligation.status
    }))
  }
}

// Id set comes from applyTo — the authoritative "what records CAN exist".
// Storage tracks which ones have VALUES.
const derivedLeafImplication = (obligation, own) => {
  const implication = { inScope: true }
  if (own?.reasons) {
    implication.reasons = own.reasons
  }
  const fulfilmentIndexes = own?.records ?? []
  implication.records = fulfilmentIndexes.map((fulfilmentIndex) => ({
    fulfilmentIndex,
    status: obligation.status
  }))
  return implication
}

// Record presence via own storage keys.
const userLeafImplication = (obligation, own, amendedFulfilments) => {
  const implication = { inScope: true }
  if (own?.reasons) {
    implication.reasons = own.reasons
  }
  const fulfilment = amendedFulfilments[obligation.id]
  const fulfilmentIndexes = isKeyedRecord(fulfilment)
    ? Object.keys(fulfilment)
    : []
  implication.records = fulfilmentIndexes.map((fulfilmentIndex) => ({
    fulfilmentIndex,
    status: obligation.status
  }))
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
    obligationApplicabilityDecisions,
    fulfilmentIndexesByObligationId,
    amendedFulfilments
  } = context

  if (!isInScope(obligation)) {
    return { inScope: false }
  }

  const category = obligationsByCategory.get(obligation.id)
  const own = obligationApplicabilityDecisions.get(obligation.id)

  switch (category) {
    case 'single':
      return singleImplication(own)
    case 'group':
      return groupImplication(obligation, own, fulfilmentIndexesByObligationId)
    case 'field':
      return fieldImplication(obligation, fulfilmentIndexesByObligationId)
    case 'derived-leaf':
      return derivedLeafImplication(obligation, own)
    case 'user-leaf':
      return userLeafImplication(obligation, own, amendedFulfilments)
    default:
      return { inScope: true }
  }
}
