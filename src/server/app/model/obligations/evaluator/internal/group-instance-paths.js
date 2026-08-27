import { INDEX_DELIMITER } from '../../index-delimiter.js'
import { isKeyedRecord } from './is-keyed-record.js'
const joinPath = (segments) => segments.join(INDEX_DELIMITER)
const splitPath = (key) => key.split(INDEX_DELIMITER)

// The instance-path prefixes one descendant's stored keyed-record
// contributes to its group's instance-id set.
const instancePathPrefixesFromRecord = (stored, prefixLen) => {
  if (!isKeyedRecord(stored)) {
    return []
  }
  return Object.keys(stored)
    .map((key) => splitPath(key))
    .filter((segments) => segments.length >= prefixLen)
    .map((segments) => joinPath(segments.slice(0, prefixLen)))
}

// A group's instance-id set: the union, across every descendant, of the
// instance-path prefixes of its stored composite keys. `storedFor`
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
    for (const id of instancePathPrefixesFromRecord(
      storedFor(desc),
      prefixLen
    )) {
      ids.add(id)
    }
  }
  return ids
}
