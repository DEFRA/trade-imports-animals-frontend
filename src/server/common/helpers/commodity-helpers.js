/**
 * Returns the first commodity details entry from a list, or null if the list
 * is empty or not an array.
 *
 * @param {Array} list - Array of commodity detail objects
 * @returns {object|null}
 */
export const toCommodityDetails = (list) =>
  Array.isArray(list) && list.length > 0 ? list[0] : null
