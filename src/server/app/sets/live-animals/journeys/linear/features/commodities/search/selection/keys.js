// A selection key names one species under one code: `0102|Bos taurus`. Codes
// are digits, so the first `|` always ends the code.
export const splitKey = (key) => {
  const separator = key.indexOf('|')
  return [key.slice(0, separator), key.slice(separator + 1)]
}

/** A species row as search returns it and as a line stores it:
 * `{ code, latinName, commonName }`. */
export const rowKey = (row) => `${row.code}|${row.latinName}`

// Canonical selection order: by code, then by Latin name — so the details
// page renders the same groups whatever order the boxes were ticked in.
const byCodeThenName = (left, right) => {
  const [leftCode, leftName] = splitKey(left)
  const [rightCode, rightName] = splitKey(right)
  return leftCode.localeCompare(rightCode) || leftName.localeCompare(rightName)
}

/**
 * The keys the page can stand behind: each must name a row the trader was
 * shown or already holds, since a key alone carries no common name. Repeats
 * collapse; the result is in canonical order.
 *
 * @param {string[]} keys - keys from the form or the stored lines.
 * @param {Map<string, object>} known - the rows the page knows, by key.
 * @returns {string[]} the known keys, once each, in canonical order.
 */
export const normaliseKeys = (keys, known) =>
  [...new Set(keys.filter((key) => known.has(key)))].sort(byCodeThenName)
