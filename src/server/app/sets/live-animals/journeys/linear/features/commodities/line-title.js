export const lineTitle = (line) => {
  const commodityCode = (line.commodityCode ?? '').trim()
  const species = line.speciesLatinName ?? ''
  return species ? `${commodityCode} — ${species}` : commodityCode
}
