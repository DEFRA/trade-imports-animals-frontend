import { isNonArrayObject } from '../../../helper-internals.js'
import { INDEX_DELIMITER } from '../../../index-delimiter.js'

// Two shape branches, dispatched below in `filterAndProject`:
//   - indexedFulfilments — collect the fulfilmentIndexes whose stored values
//     pass the predicate; optionally intersect with `projectionGroup`.
//   - unindexed — predicate either admits the value or it doesn't; a
//     projectionGroup fans the yes verdict across every instance.

const decisionFromUnindexed = (
  unindexedValue,
  predicate,
  projectionGroup,
  fulfilmentIndexesByObligationId
) => {
  if (!predicate(unindexedValue)) {
    return { inScope: false }
  }
  if (!projectionGroup) {
    return { inScope: true }
  }
  const projectionPaths = [
    ...(fulfilmentIndexesByObligationId?.get(projectionGroup.id) ?? [])
  ]
  return projectionPaths.length > 0
    ? { inScope: true, fulfilmentIndexes: projectionPaths }
    : { inScope: false }
}

const decisionFromIndexed = (
  indexedFulfilment,
  predicate,
  projectionGroup,
  fulfilmentIndexesByObligationId
) => {
  const admittedIndexes = Object.entries(indexedFulfilment)
    .filter(([, value]) => predicate(value))
    .map(([fulfilmentIndex]) => fulfilmentIndex)
  if (admittedIndexes.length === 0) {
    return { inScope: false }
  }
  if (!projectionGroup) {
    return { inScope: true, fulfilmentIndexes: admittedIndexes }
  }
  const projectionPaths =
    fulfilmentIndexesByObligationId?.get(projectionGroup.id) ?? []
  const fulfilmentIndexes = [...projectionPaths].filter((path) =>
    admittedIndexes.some(
      (idx) => path === idx || path.startsWith(`${idx}${INDEX_DELIMITER}`)
    )
  )
  return fulfilmentIndexes.length > 0
    ? { inScope: true, fulfilmentIndexes }
    : { inScope: false }
}

export const filterAndProject = (
  fulfilment,
  predicate,
  projectionGroup,
  fulfilmentIndexesByObligationId
) => {
  // Coalesce a nullish fulfilment to `{}` BEFORE the shape check — this
  // routes "nothing stored" through the indexed branch (which yields
  // `{ inScope: false }` on an empty admittedIndexes), matching the
  // pre-refactor behaviour.
  const storedFulfilment = fulfilment ?? {}
  return isNonArrayObject(storedFulfilment)
    ? decisionFromIndexed(
        storedFulfilment,
        predicate,
        projectionGroup,
        fulfilmentIndexesByObligationId
      )
    : decisionFromUnindexed(
        storedFulfilment,
        predicate,
        projectionGroup,
        fulfilmentIndexesByObligationId
      )
}
