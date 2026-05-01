/**
 * Returns the first commodity details entry from a list, or the object itself
 * if passed a plain object, or null if the value is falsy or empty (empty
 * array or empty object).
 *
 * @param {Array|object} value - Array of commodity detail objects, or a plain object
 * @returns {object|null}
 */
export const toCommodityDetails = (value) => {
  if (Array.isArray(value)) {
    return value.length > 0 ? value[0] : null
  }

  if (value && typeof value === 'object' && Object.keys(value).length > 0) {
    return value
  }

  return null
}
