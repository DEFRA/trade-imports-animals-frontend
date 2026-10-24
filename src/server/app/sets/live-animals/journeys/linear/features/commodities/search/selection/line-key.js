const SEPARATOR = '|'

/**
 * The identity of a commodity line: its commodity code and species Latin name.
 *
 * @param {{ commodityCode: string, speciesLatinName: string }} line - a line or
 *   search row.
 * @returns {string} the code and the Latin name, joined.
 */
export const lineKey = (line) =>
  `${line.commodityCode}${SEPARATOR}${line.speciesLatinName}`

export const codeAndLatinNameOf = (key) => {
  const separator = key.indexOf(SEPARATOR)
  return [key.slice(0, separator), key.slice(separator + 1)]
}
