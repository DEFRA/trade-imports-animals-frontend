import { isKeyedRecord } from '../internal/is-keyed-record.js'

const singleImplication = (own) => own ?? { inScope: true }

const groupImplication = (obligation, own, fulfilmentIdsByObligationId) => {
  const fulfilmentIds = [
    ...(fulfilmentIdsByObligationId.get(obligation.id) ?? [])
  ]
  const impl = { inScope: true }
  if (own?.reasons) {
    impl.reasons = own.reasons
  }
  impl.records = fulfilmentIds.map((fulfilmentId) => ({ fulfilmentId }))
  return impl
}

// Two shapes land here:
//   1. Group-scoped field record (`within` set) — enumerate the parent
//      group's instance-paths and stamp each one with `obligation.status`.
//   2. Top-level scalar with intrinsic status (no `within`) — the natural
//      data-only shape for an always-in-scope obligation. There is no
//      parent group to enumerate, so return the status directly,
//      mirroring what `applyTo: () => ({ inScope: true, status })` would
//      return.
const fieldImplication = (obligation, fulfilmentIdsByObligationId) => {
  if (!obligation.within) {
    return { inScope: true, status: obligation.status }
  }
  const parentGroupFulfilmentIds = [
    ...(fulfilmentIdsByObligationId.get(obligation.within.id) ?? [])
  ]
  return {
    inScope: true,
    records: parentGroupFulfilmentIds.map((fulfilmentId) => ({
      fulfilmentId,
      status: obligation.status
    }))
  }
}

// Id set comes from applyTo — the authoritative "what records CAN exist".
// Storage tracks which ones have VALUES.
const derivedLeafImplication = (obligation, own) => {
  const impl = { inScope: true }
  if (own?.reasons) {
    impl.reasons = own.reasons
  }
  const fulfilmentIds = own?.records ?? []
  impl.records = fulfilmentIds.map((fulfilmentId) => ({
    fulfilmentId,
    status: obligation.status
  }))
  return impl
}

// Record presence via own storage keys.
const userLeafImplication = (obligation, own, amendedFulfilments) => {
  const impl = { inScope: true }
  if (own?.reasons) {
    impl.reasons = own.reasons
  }
  const fulfilment = amendedFulfilments[obligation.id]
  const fulfilmentIds = isKeyedRecord(fulfilment) ? Object.keys(fulfilment) : []
  impl.records = fulfilmentIds.map((fulfilmentId) => ({
    fulfilmentId,
    status: obligation.status
  }))
  return impl
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
    fulfilmentIdsByObligationId,
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
      return groupImplication(obligation, own, fulfilmentIdsByObligationId)
    case 'field':
      return fieldImplication(obligation, fulfilmentIdsByObligationId)
    case 'derived-leaf':
      return derivedLeafImplication(obligation, own)
    case 'user-leaf':
      return userLeafImplication(obligation, own, amendedFulfilments)
    default:
      return { inScope: true }
  }
}
