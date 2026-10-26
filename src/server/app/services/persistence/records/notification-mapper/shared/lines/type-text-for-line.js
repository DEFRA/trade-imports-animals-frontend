import { commodityNameFor, typeTextForId } from '../../commodity-reference.js'

const typeKeyForLine = (line) =>
  line.commoditySelection ??
  commodityNameFor(line.commodityCode) ??
  line.commodityCode

export const typeTextForLine = (line) => {
  const text = typeTextForId(typeKeyForLine(line), line.commodityType)
  return text === '' ? undefined : text
}
