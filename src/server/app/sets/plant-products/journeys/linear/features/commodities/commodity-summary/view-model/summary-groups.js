import * as commodities from '../../../../../../services/commodities/index.js'
import * as state from '../../../../../../../../engine/index.js'

const varietyRow = (commodityCode, eppoCode, entry) => ({
  varietyLabel:
    commodities.varietyLabelFor(commodityCode, eppoCode, entry.variety) ??
    entry.variety ??
    '',
  classLabel:
    commodities.classLabelFor(entry.varietyClass) ?? entry.varietyClass ?? ''
})

const varietiesForSpecies = (
  answers,
  evaluation,
  lineIndex,
  commodityCode,
  species
) =>
  state
    .collectionView(
      answers,
      ['commodityLines', lineIndex, 'species', species.index, 'varieties'],
      evaluation
    )
    .map(({ entry }) =>
      varietyRow(commodityCode, species.entry.eppoCode, entry)
    )

const speciesRow = (
  answers,
  evaluation,
  lineIndex,
  commodityCode,
  species,
  removable
) => ({
  speciesIndex: species.index,
  genusAndSpecies: species.entry.genusAndSpecies ?? '',
  eppoCode: species.entry.eppoCode ?? '',
  varieties: varietiesForSpecies(
    answers,
    evaluation,
    lineIndex,
    commodityCode,
    species
  ),
  removable
})

const rowsForLine = (answers, evaluation, line) => {
  const commodityCode = line.entry.commoditySelection ?? ''
  const species = state.collectionView(
    answers,
    ['commodityLines', line.index, 'species'],
    evaluation
  )
  const removable = species.length > 1
  return species.map((entry) =>
    speciesRow(answers, evaluation, line.index, commodityCode, entry, removable)
  )
}

const summaryGroup = (answers, evaluation, line) => {
  const commodityCode = line.entry.commoditySelection ?? ''
  return {
    lineIndex: line.index,
    commodityCode,
    commodityDescription: commodities.descriptionFor(commodityCode) ?? '',
    rows: rowsForLine(answers, evaluation, line)
  }
}

export const buildSummaryGroups = (answers, evaluation) =>
  state
    .collectionView(answers, ['commodityLines'], evaluation)
    .map((line) => summaryGroup(answers, evaluation, line))
