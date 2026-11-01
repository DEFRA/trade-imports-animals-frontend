import {
  commodityDescriptionFor,
  commodityNameFor
} from '../commodity-reference.js'
import { compact } from '../shared/compact.js'
import { groupLinesByCommodity } from '../shared/lines/group-by-commodity.js'
import { speciesEntryFromLine } from '../shared/lines/species-entry.js'
import { speciesLines } from '../shared/lines/species-lines.js'
import { totalOf } from '../shared/lines/total.js'
import { typeTextForLine } from '../shared/lines/type-text-for-line.js'

const groupHasUniformType = (group) => {
  const types = new Set(group.map((line) => typeTextForLine(line) ?? ''))
  return types.size <= 1
}

const commodityEntryFromGroup = (group) => {
  const uniformType = groupHasUniformType(group)
  const species = speciesLines(group).map((line) =>
    speciesEntryFromLine(line, {
      typeOfCommodity: uniformType ? undefined : typeTextForLine(line)
    })
  )
  const head = group[0]
  const code = head.commodityCode
  return compact({
    name: commodityNameFor(code) ?? code,
    commodityCode: code,
    description: code ? commodityDescriptionFor(code) : undefined,
    typeOfCommodity: uniformType ? typeTextForLine(group[0]) : undefined,
    totalNoOfAnimals: totalOf(group, 'numberOfAnimalsQuantity'),
    totalNoOfPackages: totalOf(group, 'numberOfPackages'),
    species: species.length > 0 ? species : undefined
  })
}

export const commoditiesFromLinesA = (lines) => {
  if (!Array.isArray(lines) || lines.length === 0) {
    return undefined
  }
  return groupLinesByCommodity(lines).map(commodityEntryFromGroup)
}
