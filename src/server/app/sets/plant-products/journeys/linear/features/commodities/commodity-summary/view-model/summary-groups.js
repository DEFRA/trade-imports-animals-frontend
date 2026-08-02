import * as commodities from '../../../../../../services/commodities/index.js'
import * as state from '../../../../../../../../engine/index.js'

const varietyRow = (eppoCode, entry) => ({
  varietyLabel:
    commodities.varietyLabelFor(eppoCode, entry.variety) ?? entry.variety ?? '',
  classLabel:
    commodities.classLabelFor(entry.varietyClass) ?? entry.varietyClass ?? ''
})

const varietiesForSpecies = (answers, evaluation, lineIndex, species) =>
  state
    .collectionView(
      answers,
      ['commodityLines', lineIndex, 'species', species.index, 'varieties'],
      evaluation
    )
    .map(({ entry }) => varietyRow(species.entry.eppoCode, entry))

const speciesRow = (answers, evaluation, lineIndex, species, removable) => ({
  speciesIndex: species.index,
  genusAndSpecies: species.entry.genusAndSpecies ?? '',
  eppoCode: species.entry.eppoCode ?? '',
  varieties: varietiesForSpecies(answers, evaluation, lineIndex, species),
  removable
})

const rowsForLine = (answers, evaluation, line) => {
  const species = state.collectionView(
    answers,
    ['commodityLines', line.index, 'species'],
    evaluation
  )
  const removable = species.length > 1
  return species.map((entry) =>
    speciesRow(answers, evaluation, line.index, entry, removable)
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
