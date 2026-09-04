import { INDEX_DELIMITER } from '../../index-delimiter.js'
import { isNonArrayObject } from '../../helper-internals.js'
const joinIndex = (segments) => segments.join(INDEX_DELIMITER)
const splitIndex = (fulfilmentIndex) => fulfilmentIndex.split(INDEX_DELIMITER)

// The fulfilmentIndex prefixes one descendant contributes to its
// group's fulfilmentIndex set — take the first `prefixLength` segments
// of each stored fulfilmentIndex.
const indexPrefixesFromDescendant = (fulfilment, prefixLength) => {
  if (!isNonArrayObject(fulfilment)) {
    return []
  }
  return Object.keys(fulfilment)
    .map((fulfilmentIndex) => splitIndex(fulfilmentIndex))
    .filter((segments) => segments.length >= prefixLength)
    .map((segments) => joinIndex(segments.slice(0, prefixLength)))
}

// Union the fulfilmentIndex prefixes contributed by every descendant.
// `fulfilmentFor` resolves a descendant to its stored fulfilment (raw
// pre-purge or amended post-purge, depending on the caller).
export const deriveGroupFulfilmentIndexes = (
  obligation,
  obligationAncestorGroups,
  obligationDescendants,
  fulfilmentFor
) => {
  const prefixLength = obligationAncestorGroups.get(obligation.id).length + 1
  const ids = new Set()
  for (const descendant of obligationDescendants.get(obligation.id)) {
    for (const id of indexPrefixesFromDescendant(
      fulfilmentFor(descendant),
      prefixLength
    )) {
      ids.add(id)
    }
  }
  return ids
}
