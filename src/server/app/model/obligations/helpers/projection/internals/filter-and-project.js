import { isNonArrayObject } from '../../../helper-internals.js'
import { INDEX_DELIMITER } from '../../../index-delimiter.js'

// Two shape branches, each producing its applyTo decision natively:
//   - Indexed fulfilment (indexedFulfilments map). Collect the fulfilmentIndexes
//     whose stored values pass the predicate; optionally project through
//     `projectionGroup`'s instances (a depth-N > 1 gate).
//   - Unindexed fulfilment (single stored value). Predicate either admits it
//     or it doesn't; if a projectionGroup is set, the unindexed value's
//     yes/no verdict fans out across every instance of that group.
//
// The two branches don't share a "list of keys" abstraction — an unindexed
// value has no key. Each returns its own `{ inScope, fulfilmentIndexes? }`
// decision.

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
