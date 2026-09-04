import { isNonArrayObject } from '../../helper-internals.js'

// Keep only entries whose fulfilmentIndex is in the applyTo-authorised
// set; `{ keep: false }` when nothing survives.
const purgedApplyToDerived = (
  obligation,
  fulfilment,
  applicabilityDecisions
) => {
  const authorisedIndexes = new Set(
    applicabilityDecisions.get(obligation.id)?.fulfilmentIndexes ?? []
  )
  const filtered = {}
  for (const [fulfilmentIndex, value] of Object.entries(fulfilment ?? {})) {
    if (authorisedIndexes.has(fulfilmentIndex)) {
      filtered[fulfilmentIndex] = value
    }
  }
  return Object.keys(filtered).length > 0
    ? { keep: true, value: filtered }
    : { keep: false }
}

// Drop an indexedFulfilments map only if it's empty.
const purgedIndexedFulfilments = (fulfilment) =>
  Object.keys(fulfilment).length > 0
    ? { keep: true, value: fulfilment }
    : { keep: false }

const purgedFulfilmentFor = (
  obligation,
  fulfilment,
  obligationCategory,
  applicabilityDecisions
) => {
  if (obligationCategory === 'apply-to-derived') {
    return purgedApplyToDerived(obligation, fulfilment, applicabilityDecisions)
  }
  if (obligationCategory === 'unindexed') {
    return { keep: true, value: fulfilment }
  }
  if (isNonArrayObject(fulfilment)) {
    return purgedIndexedFulfilments(fulfilment)
  }
  return { keep: true, value: fulfilment }
}

// Out-of-scope obligation → drop entire entry. apply-to-derived leaf →
// keep only entries the gate still authorises. Others (parent-derived,
// user-input-derived) → keep as-is; own storage is self-valid.
export function purgeStorage(recognisedFulfilments, context) {
  const {
    obligationsById,
    obligationsByCategory,
    applicabilityDecisions,
    isInScope
  } = context

  const amendedFulfilments = {}
  for (const [obligationId, fulfilment] of Object.entries(
    recognisedFulfilments
  )) {
    const obligation = obligationsById.get(obligationId)
    if (!isInScope(obligation)) {
      continue
    }

    const obligationCategory = obligationsByCategory.get(obligation.id)
    const purged = purgedFulfilmentFor(
      obligation,
      fulfilment,
      obligationCategory,
      applicabilityDecisions
    )
    if (purged.keep) {
      amendedFulfilments[obligationId] = purged.value
    }
  }
  return amendedFulfilments
}
