import {
  commodityDescriptionFor,
  commodityNameFor
} from '../commodity-reference.js'
import { compact } from '../shared/compact.js'
import { groupLinesByCommodityCode } from '../shared/lines/group-by-commodity-code.js'
import { speciesEntryFromLine } from '../shared/lines/species-entry.js'
import { speciesLines } from '../shared/lines/species-lines.js'
import { totalOf } from '../shared/lines/total.js'

const commodityNameForGroup = (group) => {
  const firstLine = group[0]
  const code = firstLine.commodityCode
  const fromCatalogue = commodityNameFor(code)
  if (fromCatalogue) {
    return fromCatalogue
  }
  const speciesCommonName = speciesLines(group)[0]?.speciesCommonName
  if (speciesCommonName) {
    return speciesCommonName
  }
  return code
}

const commodityEntryFromGroup = (group) => {
  const species = speciesLines(group).map(speciesEntryFromLine)
  const firstLine = group[0]
  const code = firstLine.commodityCode
  return compact({
    name: commodityNameForGroup(group),
    commodityCode: code,
    description: commodityDescriptionFor(code),
    totalNoOfAnimals: totalOf(group, 'numberOfAnimalsQuantity'),
    totalNoOfPackages: totalOf(group, 'numberOfPackages'),
    species: species.length > 0 ? species : undefined
  })
}

export const commoditiesFromLines = (lines) => {
  if (!Array.isArray(lines) || lines.length === 0) {
    return undefined
  }
  return groupLinesByCommodityCode(lines).map(commodityEntryFromGroup)
}
