import {
  commodityDescriptionFor,
  commodityNameFor
} from '../commodity-reference.js'
import { compact } from '../shared/compact.js'
import { groupLinesByCommodityCode } from '../shared/lines/group-by-commodity-code.js'
import { speciesEntryFromLine } from '../shared/lines/species-entry.js'
import { speciesLines } from '../shared/lines/species-lines.js'
import { totalOf } from '../shared/lines/total.js'
import { typeTextForLine } from '../shared/lines/type-text-for-line.js'

const groupHasUniformType = (group) => {
  const speciesOnly = speciesLines(group)
  const lines = speciesOnly.length > 0 ? speciesOnly : group
  const types = new Set(lines.map((line) => typeTextForLine(line) ?? ''))
  return types.size <= 1
}

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
  const uniformType = groupHasUniformType(group)
  const species = speciesLines(group).map((line) =>
    speciesEntryFromLine(line, {
      typeOfCommodity: uniformType ? undefined : typeTextForLine(line)
    })
  )
  const firstLine = group[0]
  const code = firstLine.commodityCode
  return compact({
    name: commodityNameForGroup(group),
    commodityCode: code,
    description: commodityDescriptionFor(code),
    typeOfCommodity: uniformType ? typeTextForLine(firstLine) : undefined,
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
