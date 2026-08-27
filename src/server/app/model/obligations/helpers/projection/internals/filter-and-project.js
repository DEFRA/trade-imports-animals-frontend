import { isRecordMap } from '../../../helper-internals.js'

// Kept in sync with bridge/fulfilment-id.js#INDEX_DELIMITER; model/
// cannot import from bridge/ per the dep-cruiser model-import-boundary rule.
const INDEX_DELIMITER = '.'

// The two storage shapes `filterAndProject` reads: a keyed-record map
// (one candidate per key) or a bare scalar (a single candidate, keyed
// by the empty string so the downstream record/projection logic can
// treat both shapes uniformly).
const recordMapPassingKeys = (stored, predicate) =>
  Object.entries(stored)
    .filter(([, value]) => predicate(value))
    .map(([key]) => key)

const scalarPassingKeys = (stored, predicate) => (predicate(stored) ? [''] : [])

const pathMatchesPassingKey = (path, key) =>
  key === '' || path === key || path.startsWith(`${key}${INDEX_DELIMITER}`)

const projectedRecords = (
  projectionGroup,
  passingKeys,
  fulfilmentIdsByObligationId
) => {
  const projectionPaths =
    fulfilmentIdsByObligationId?.get(projectionGroup.id) ?? []
  return projectionPaths.filter((path) =>
    passingKeys.some((key) => pathMatchesPassingKey(path, key))
  )
}

const decisionForPassingKeys = (
  passingKeys,
  projectionGroup,
  fulfilmentIdsByObligationId
) => {
  if (passingKeys.length === 0) {
    return { inScope: false }
  }
  if (!projectionGroup) {
    return { inScope: true, records: passingKeys }
  }
  const records = projectedRecords(
    projectionGroup,
    passingKeys,
    fulfilmentIdsByObligationId
  )
  return { inScope: records.length > 0, records }
}

export const filterAndProject = (
  storedForGate,
  predicate,
  projectionGroup,
  fulfilmentIdsByObligationId
) => {
  const stored = storedForGate ?? {}
  const passingKeys = isRecordMap(stored)
    ? recordMapPassingKeys(stored, predicate)
    : scalarPassingKeys(stored, predicate)

  return decisionForPassingKeys(
    passingKeys,
    projectionGroup,
    fulfilmentIdsByObligationId
  )
}
