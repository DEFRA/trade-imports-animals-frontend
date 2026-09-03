import { INDEX_DELIMITER } from '../../index-delimiter.js'
import { isKeyedRecord } from './is-keyed-record.js'
const joinIndex = (segments) => segments.join(INDEX_DELIMITER)
const splitIndex = (key) => key.split(INDEX_DELIMITER)

// The fulfilment-index prefixes one descendant's stored keyed-record
// contributes to its group's fulfilment-index set.
const indexPrefixesFromRecord = (stored, prefixLen) => {
  if (!isKeyedRecord(stored)) {
    return []
  }
  return Object.keys(stored)
    .map((key) => splitIndex(key))
    .filter((segments) => segments.length >= prefixLen)
    .map((segments) => joinIndex(segments.slice(0, prefixLen)))
}

// A group's fulfilment-index set: the union, across every descendant, of the
// fulfilment-index prefixes of its stored record-map keys. `storedFor`
// resolves a descendant to its stored fulfilment (pre- or post-purge,
// depending on the caller).
export const groupInstancePaths = (
  obligation,
  obligationAncestorGroups,
  obligationDescendants,
  storedFor
) => {
  const prefixLen = obligationAncestorGroups.get(obligation.id).length + 1
  const ids = new Set()
  for (const desc of obligationDescendants.get(obligation.id)) {
    for (const id of indexPrefixesFromRecord(storedFor(desc), prefixLen)) {
      ids.add(id)
    }
  }
  return ids
}
