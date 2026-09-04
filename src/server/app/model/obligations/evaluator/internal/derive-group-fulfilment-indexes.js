import { INDEX_DELIMITER } from '../../index-delimiter.js'
import { isNonArrayObject } from '../../helper-internals.js'
const joinIndex = (segments) => segments.join(INDEX_DELIMITER)
const splitIndex = (key) => key.split(INDEX_DELIMITER)

// The fulfilmentIndex prefixes one descendant's indexedFulfilments
// contributes to its group's fulfilmentIndex set.
const indexPrefixesFromDescendant = (fulfilment, prefixLen) => {
  if (!isNonArrayObject(fulfilment)) {
    return []
  }
  return Object.keys(fulfilment)
    .map((key) => splitIndex(key))
    .filter((segments) => segments.length >= prefixLen)
    .map((segments) => joinIndex(segments.slice(0, prefixLen)))
}

// A group's fulfilmentIndex set: the union, across every descendant, of the
// fulfilmentIndex prefixes of its indexedFulfilments keys. `fulfilmentFor`
// resolves a descendant to its stored fulfilment (pre- or post-purge,
// depending on the caller).
export const deriveGroupFulfilmentIndexes = (
  obligation,
  obligationAncestorGroups,
  obligationDescendants,
  fulfilmentFor
) => {
  const prefixLen = obligationAncestorGroups.get(obligation.id).length + 1
  const ids = new Set()
  for (const descendant of obligationDescendants.get(obligation.id)) {
    for (const id of indexPrefixesFromDescendant(
      fulfilmentFor(descendant),
      prefixLen
    )) {
      ids.add(id)
    }
  }
  return ids
}
