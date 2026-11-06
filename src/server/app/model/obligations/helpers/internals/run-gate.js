import { isObject } from '../../../../lib/object.js'
import { INDEX_DELIMITER } from '../../index-delimiter.js'

const runGateUnindexed = (
  unindexedFulfilment,
  predicate,
  gatedParentGroup,
  fulfilmentIndexesByObligationId
) => {
  if (!predicate(unindexedFulfilment)) {
    return { inScope: false }
  }
  if (!gatedParentGroup) {
    return { inScope: true }
  }
  const parentFulfilmentIndexes = [
    ...(fulfilmentIndexesByObligationId?.get(gatedParentGroup.id) ?? [])
  ]
  return parentFulfilmentIndexes.length > 0
    ? { inScope: true, fulfilmentIndexes: parentFulfilmentIndexes }
    : { inScope: false }
}

const runGateIndexed = (
  indexedFulfilment,
  predicate,
  gatedParentGroup,
  fulfilmentIndexesByObligationId
) => {
  const admittedIndexes = Object.entries(indexedFulfilment)
    .filter(([, value]) => predicate(value))
    .map(([fulfilmentIndex]) => fulfilmentIndex)
  if (admittedIndexes.length === 0) {
    return { inScope: false }
  }
  if (!gatedParentGroup) {
    return { inScope: true, fulfilmentIndexes: admittedIndexes }
  }
  const parentFulfilmentIndexes =
    fulfilmentIndexesByObligationId?.get(gatedParentGroup.id) ?? []
  const fulfilmentIndexes = [...parentFulfilmentIndexes].filter((path) =>
    admittedIndexes.some(
      (idx) => path === idx || path.startsWith(`${idx}${INDEX_DELIMITER}`)
    )
  )
  return fulfilmentIndexes.length > 0
    ? { inScope: true, fulfilmentIndexes }
    : { inScope: false }
}

export const runGate = (
  fulfilment,
  predicate,
  gatedParentGroup,
  fulfilmentIndexesByObligationId
) => {
  const fulfilmentOrEmpty = fulfilment ?? {}
  return isObject(fulfilmentOrEmpty)
    ? runGateIndexed(
        fulfilmentOrEmpty,
        predicate,
        gatedParentGroup,
        fulfilmentIndexesByObligationId
      )
    : runGateUnindexed(
        fulfilmentOrEmpty,
        predicate,
        gatedParentGroup,
        fulfilmentIndexesByObligationId
      )
}
