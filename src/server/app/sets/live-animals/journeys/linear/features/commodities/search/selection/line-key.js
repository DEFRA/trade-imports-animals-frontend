const SEPARATOR = '|'

export const lineKey = (line) =>
  `${line.commodityCode}${SEPARATOR}${line.speciesLatinName}`

export const codeAndLatinNameOf = (key) => {
  const separator = key.indexOf(SEPARATOR)
  return [key.slice(0, separator), key.slice(separator + 1)]
}
