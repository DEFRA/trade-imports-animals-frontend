import { typeTextForId } from '../commodity-reference.js'
import { compact } from '../shared/compact.js'
import { groupLinesByCommodityCode } from '../shared/lines/group-by-commodity-code.js'
import { speciesEntryFromLine } from '../shared/lines/species-entry.js'
import { speciesLines } from '../shared/lines/species-lines.js'
import { totalOf } from '../shared/lines/total.js'

const typeTextForLine = (line) => {
  const text = typeTextForId(line.commodityCode, line.commodityType)
  return text === '' ? undefined : text
}

const complementFromGroup = (group) => {
  const species = speciesLines(group).map(speciesEntryFromLine)
  return compact({
    typeOfCommodity: typeTextForLine(group[0]),
    totalNoOfAnimals: totalOf(group, 'numberOfAnimalsQuantity'),
    totalNoOfPackages: totalOf(group, 'numberOfPackages'),
    species: species.length > 0 ? species : undefined
  })
}

export const commodityFromLines = (lines) => {
  if (!Array.isArray(lines) || lines.length === 0) {
    return undefined
  }
  return {
    name: lines[0].commodityCode,
    commodityComplement:
      groupLinesByCommodityCode(lines).map(complementFromGroup)
  }
}
