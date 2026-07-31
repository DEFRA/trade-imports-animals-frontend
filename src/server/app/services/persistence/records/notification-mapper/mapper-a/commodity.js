import { typeTextForId } from '../../../../commodities/index.js'
import { compact } from '../shared/compact.js'
import { groupLinesByCommodity } from '../shared/lines/group-by-commodity.js'
import { speciesEntryFromLine } from '../shared/lines/species-entry.js'
import { speciesLines } from '../shared/lines/species-lines.js'
import { totalOf } from '../shared/lines/total.js'

// One complement per commodity group. The complement totals are numbers (the
// skeleton computes them via a lodash sum over the per-species counts), while
// the per-species noOfAnimals/noOfPackages stay the raw string answers.
// typeOfCommodity is the payload text of the line's stored commodityType id,
// omitted when that type's text is blank (the single-type commodities).
export const typeTextForLine = (line) => {
  const text = typeTextForId(line.commoditySelection, line.commodityType)
  return text === '' ? undefined : text
}

export const baseComplementFromGroup = (group) => {
  const species = speciesLines(group).map(speciesEntryFromLine)
  return compact({
    typeOfCommodity: typeTextForLine(group[0]),
    totalNoOfAnimals: totalOf(group, 'numberOfAnimalsQuantity'),
    totalNoOfPackages: totalOf(group, 'numberOfPackages'),
    species: species.length > 0 ? species : undefined
  })
}

export const commodityFromLinesA = (lines) => {
  if (!Array.isArray(lines) || lines.length === 0) return undefined
  return {
    name: lines[0].commoditySelection,
    commodityComplement: groupLinesByCommodity(lines).map(
      baseComplementFromGroup
    )
  }
}
