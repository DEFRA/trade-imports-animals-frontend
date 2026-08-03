import * as state from '../../../../../../../../engine/index.js'
import { copyFor } from '../../../../../../../../shared/copy.js'
import {
  descriptionFor,
  isPlantsForPlanting
} from '../../../../../../services/commodities/index.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { copy as en } from '../../copy/copy.en.js'
import { changeHref } from '../rows/change-link.js'
import { row } from '../rows/summary-row.js'
import {
  classText,
  escapeHtml,
  packageTypeText,
  quantityTypeText,
  varietyText,
  yesNoText
} from '../rows/value-text.js'

const copy = copyFor({ en, cy })
const cardCopy = copy.cards.commodities
const cell = (text) => ({ text: String(text ?? '') })
const header = (text) => ({ text })

const changeCell = (journeyId, lineIndex) => {
  const href = changeHref('commodityLines', journeyId)
  const hidden = cardCopy.changeCommodity(lineIndex + 1)
  return {
    html: `<a class="govuk-link" href="${escapeHtml(href)}">${escapeHtml(copy.change)}<span class="govuk-visually-hidden"> ${escapeHtml(hidden)}</span></a>`
  }
}

const commodityTable = (journeyId, lines) => ({
  caption: cardCopy.tables.commodities,
  head: [
    header(cardCopy.columns.line),
    header(cardCopy.columns.code),
    header(cardCopy.columns.description),
    header(cardCopy.columns.action)
  ],
  rows: lines.map(({ index, entry }) => [
    cell(cardCopy.commodity(index + 1)),
    cell(entry.commoditySelection),
    cell(descriptionFor(entry.commoditySelection)),
    changeCell(journeyId, index)
  ])
})

const speciesTable = (answers, evaluation, lines) => {
  const rows = lines.flatMap(({ index: lineIndex }) =>
    state
      .collectionView(
        answers,
        ['commodityLines', lineIndex, 'species'],
        evaluation
      )
      .map(({ index, entry }) => [
        cell(cardCopy.commodity(lineIndex + 1)),
        cell(cardCopy.species(index + 1)),
        cell(`${entry.genusAndSpecies}, ${entry.eppoCode}`)
      ])
  )
  return {
    caption: cardCopy.tables.species,
    head: [
      header(cardCopy.columns.line),
      header(cardCopy.columns.species),
      header(cardCopy.columns.genusAndSpecies)
    ],
    rows
  }
}

const varietyTable = (answers, evaluation, lines) => {
  const rows = lines.flatMap(({ index: lineIndex }) =>
    state
      .collectionView(
        answers,
        ['commodityLines', lineIndex, 'species'],
        evaluation
      )
      .flatMap(({ index: speciesIndex, entry: species }) =>
        state
          .collectionView(
            answers,
            ['commodityLines', lineIndex, 'species', speciesIndex, 'varieties'],
            evaluation
          )
          .map(({ entry }) => [
            cell(cardCopy.commodity(lineIndex + 1)),
            cell(`${species.genusAndSpecies}, ${species.eppoCode}`),
            cell(varietyText(species.eppoCode, entry.variety)),
            cell(classText(entry.varietyClass))
          ])
      )
  )
  return rows.length
    ? {
        caption: cardCopy.tables.varieties,
        head: [
          header(cardCopy.columns.line),
          header(cardCopy.columns.genusAndSpecies),
          header(cardCopy.columns.variety),
          header(cardCopy.columns.varietyClass)
        ],
        rows
      }
    : null
}

const measuresTable = (lines) => ({
  caption: cardCopy.tables.measures,
  head: [
    header(cardCopy.columns.line),
    header(cardCopy.columns.packages),
    header(cardCopy.columns.packageType),
    header(cardCopy.columns.quantity),
    header(cardCopy.columns.quantityType),
    header(cardCopy.columns.netWeight),
    header(cardCopy.columns.controlledAtmosphere),
    header(cardCopy.columns.finishedOrPropagated),
    header(cardCopy.columns.testAndTrial)
  ],
  rows: lines.map(({ index, entry }) => [
    cell(cardCopy.commodity(index + 1)),
    cell(entry.numberOfPackages),
    cell(packageTypeText(entry.packageType)),
    cell(entry.quantity),
    cell(quantityTypeText(entry.quantityType)),
    cell(entry.netWeight),
    cell(yesNoText(entry.controlledAtmosphereContainer, copy.yesNo)),
    cell(
      copy.finishedOrPropagated[entry.finishedOrPropagated] ??
        entry.finishedOrPropagated
    ),
    cell(yesNoText(entry.testAndTrial, copy.yesNo))
  ])
})

const intendedForFinalUsersRows = (journeyId, scope, lines) =>
  lines
    .filter(({ entry }) => isPlantsForPlanting(entry.commoditySelection))
    .map(({ index, entry }) =>
      row({
        label: `${cardCopy.columns.intendedForFinalUsers} (${cardCopy.commodity(index + 1).toLowerCase()})`,
        value: yesNoText(entry.intendedForFinalUsers, copy.yesNo),
        obligationName: `commodityLines[${index}].intendedForFinalUsers`,
        journeyId,
        scope,
        visuallyHiddenText: `${cardCopy.columns.intendedForFinalUsers.toLowerCase()} for ${cardCopy.commodity(index + 1).toLowerCase()}`
      })
    )
    .filter(Boolean)

export const commoditiesCard = (journeyId, answers, scope, evaluation) => {
  const lines = state.collectionView(answers, ['commodityLines'], evaluation)
  const varieties = varietyTable(answers, evaluation, lines)

  return {
    heading: cardCopy.heading,
    rows: intendedForFinalUsersRows(journeyId, scope, lines),
    tables: [
      commodityTable(journeyId, lines),
      speciesTable(answers, evaluation, lines),
      ...(varieties ? [varieties] : []),
      measuresTable(lines)
    ]
  }
}
