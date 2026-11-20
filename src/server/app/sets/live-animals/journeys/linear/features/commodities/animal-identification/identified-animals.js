import { isBlank } from '../../../../../../../lib/answered.js'
import { identifiedCommodityCodes } from '../../../../../services/commodities/index.js'
import { linesOf } from '../lines.js'
import { scopedFields } from './identifier/fields.js'
import { unitsForCommodityLine } from './units-for-commodity-line.js'

const countOfIdentifiedAnimals = (answers, evaluation, { entry, index }) => {
  const identifierIds = scopedFields(
    entry.commodityCode,
    entry.speciesLatinName
  ).map(({ id }) => id)
  return unitsForCommodityLine(answers, evaluation, index).filter((unit) =>
    identifierIds.some((id) => !isBlank(unit[id]))
  ).length
}

const isShortOfIdentifiedAnimals = (answers, evaluation, line) =>
  identifiedCommodityCodes().includes(line.entry.commodityCode) &&
  countOfIdentifiedAnimals(answers, evaluation, line) <
    Number(line.entry.numberOfAnimalsQuantity)

export const anyLineIsShortOfIdentifiedAnimals = (answers, evaluation) =>
  linesOf(answers, evaluation).some((line) =>
    isShortOfIdentifiedAnimals(answers, evaluation, line)
  )
