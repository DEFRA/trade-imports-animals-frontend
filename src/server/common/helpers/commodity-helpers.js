/**
 * Returns the first commodity details entry from a list, or the object itself
 * if passed a plain object, or null if the list is empty or the value is falsy.
 *
 * @param {Array|object} list - Array of commodity detail objects, or a plain object
 * @returns {object|null}
 */
export const toCommodityDetails = (list) => {
  if (Array.isArray(list)) {
    return list.length > 0 ? list[0] : null
  }

  if (list && typeof list === 'object') {
    return list
  }

  return null
}
