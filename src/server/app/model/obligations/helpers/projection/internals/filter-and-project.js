import { isNonArrayObject } from '../../../helper-internals.js'
import { INDEX_DELIMITER } from '../../../index-delimiter.js'

// Two shape branches, dispatched below in `filterAndProject`:
//   - indexedFulfilments — collect the fulfilmentIndexes whose stored values
//     pass the predicate; optionally intersect with `gatedParentGroup`.
//   - unindexed — predicate either admits the value or it doesn't; a
//     gatedParentGroup fans the yes verdict across every instance.

const decisionFromUnindexed = (
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
  const projectionPaths = [
    ...(fulfilmentIndexesByObligationId?.get(gatedParentGroup.id) ?? [])
  ]
  return projectionPaths.length > 0
    ? { inScope: true, fulfilmentIndexes: projectionPaths }
    : { inScope: false }
}

const decisionFromIndexed = (
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
  const projectionPaths =
    fulfilmentIndexesByObligationId?.get(gatedParentGroup.id) ?? []
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
  gatedParentGroup,
  fulfilmentIndexesByObligationId
) => {
  // `{}` for "nothing stored" routes through the indexed branch, which
  // yields `{ inScope: false }` on empty admittedIndexes. Without the
  // default, the undefined would fall through to `decisionFromUnindexed`
  // and the predicate could spuriously return `true` on `undefined`.
  const fulfilmentOrEmpty = fulfilment ?? {}
  return isNonArrayObject(fulfilmentOrEmpty)
    ? decisionFromIndexed(
        fulfilmentOrEmpty,
        predicate,
        gatedParentGroup,
        fulfilmentIndexesByObligationId
      )
    : decisionFromUnindexed(
        fulfilmentOrEmpty,
        predicate,
        gatedParentGroup,
        fulfilmentIndexesByObligationId
      )
}
