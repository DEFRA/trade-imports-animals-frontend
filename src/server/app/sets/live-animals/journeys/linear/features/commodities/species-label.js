export const speciesLabel = (line) => {
  if (!line.speciesLatinName) {
    return ''
  }
  return line.speciesCommonName
    ? `${line.speciesLatinName} (${line.speciesCommonName})`
    : line.speciesLatinName
}

export const speciesDisplayName = (line) => {
  const name = (line.speciesLatinName ?? '').toLowerCase()
  return `${name.charAt(0).toUpperCase()}${name.slice(1)}`
}

export const speciesSentenceName = (line) =>
  (line.speciesLatinName ?? '').toLowerCase()
