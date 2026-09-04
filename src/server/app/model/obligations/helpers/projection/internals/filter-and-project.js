import { isNonArrayObject } from '../../../helper-internals.js'
import { INDEX_DELIMITER } from '../../../index-delimiter.js'

// Two shape branches, each producing its applyTo decision natively:
//   - Indexed fulfilment (indexedFulfilments map). Collect the fulfilmentIndexes
//     whose stored values pass the predicate; optionally project through
//     `projectionGroup`'s instances (a depth-N > 1 gate).
//   - Scalar fulfilment (single stored value). Predicate either admits it
//     or it doesn't; if a projectionGroup is set, the scalar's yes/no
//     verdict fans out across every instance of that group.
//
// The two branches don't share a "list of keys" abstraction — a scalar
// has no key. Each returns its own `{ inScope, fulfilmentIndexes? }`
// decision.

const decisionFromScalar = (
  scalar,
  predicate,
  projectionGroup,
  fulfilmentIndexesByObligationId
) => {
  if (!predicate(scalar)) {
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
  const stored = fulfilment ?? {}
  return isNonArrayObject(stored)
    ? decisionFromIndexed(
        stored,
        predicate,
        projectionGroup,
        fulfilmentIndexesByObligationId
      )
    : decisionFromScalar(
        stored,
        predicate,
        projectionGroup,
        fulfilmentIndexesByObligationId
      )
}
