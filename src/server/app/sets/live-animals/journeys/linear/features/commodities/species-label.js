export const speciesLabel = (line) => {
  if (!line.speciesLatinName) {
    return ''
  }
  return line.speciesCommonName
    ? `${line.speciesLatinName} (${line.speciesCommonName})`
    : line.speciesLatinName
}

const capitalised = (word) =>
  `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`

export const speciesTitleName = (line) =>
  (line.speciesLatinName ?? '').split(' ').map(capitalised).join(' ')

export const speciesSentenceName = (line) =>
  (line.speciesLatinName ?? '').toLowerCase()
