import { speciesLabel } from './species-label.js'

export const lineTitle = (line) => {
  const commodityCode = (line.commodityCode ?? '').trim()
  const species = speciesLabel(line)
  return species ? `${commodityCode} — ${species}` : commodityCode
}
