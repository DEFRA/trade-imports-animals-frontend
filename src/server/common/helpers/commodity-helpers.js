/**
 * Returns the first commodity details entry from a list, or the object itself
 * if passed a plain object, or null if the value is falsy or empty (empty
 * array or empty object).
 *
 * @param {Array|object} list - Array of commodity detail objects, or a plain object
 * @returns {object|null}
 */
export const toCommodityDetails = (list) => {
  if (Array.isArray(list)) {
    return list.length > 0 ? list[0] : null
  }

  if (list && typeof list === 'object' && Object.keys(list).length > 0) {
    return list
  }

  return null
}
