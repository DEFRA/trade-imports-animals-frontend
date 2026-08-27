import { isKeyedRecord } from './is-keyed-record.js'

// Kept in sync with bridge/fulfilment-id.js#INSTANCE_ID_DELIMITER; model/
// cannot import from bridge/ per the dep-cruiser model-import-boundary rule.
const INSTANCE_ID_DELIMITER = '.'
const joinPath = (segments) => segments.join(INSTANCE_ID_DELIMITER)
const splitPath = (key) => key.split(INSTANCE_ID_DELIMITER)

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
