/**
 * deriveUnion — collapse a list of allowlists (or a flat list of
 * values) into a set-like array. Preserves first-seen order across
 * inputs so `.metadata.values` is deterministic + comparable.
 */
export const deriveUnion = (unionOfAllowlists) => {
  const flat =
    unionOfAllowlists.length > 0 && Array.isArray(unionOfAllowlists[0])
      ? unionOfAllowlists.flat()
      : unionOfAllowlists
  return [...new Set(flat)]
}
