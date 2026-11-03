import { typeTextForId } from '../../commodity-reference.js'

export const typeTextForLine = (line) => {
  const text = typeTextForId(line.commodityCode, line.commodityType)
  return text === '' ? undefined : text
}
