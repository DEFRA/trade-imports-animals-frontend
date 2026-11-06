export const speciesLabel = (line) => {
  if (!line.speciesLatinName) {
    return ''
  }
  return line.speciesCommonName
    ? `${line.speciesLatinName} (${line.speciesCommonName})`
    : line.speciesLatinName
}
