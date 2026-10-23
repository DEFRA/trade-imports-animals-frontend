import * as commodities from '../../../../../services/commodities/index.js'
import { wrappingCell } from '../../../../../../../../common/constants/table-cells.js'
import { escapeHtml } from '../../documents/view-model/fragments/text.js'
import { buildCommodityGroups } from './commodity-groups.js'

const latinNameOf = ({ entry }) =>
  commodities.speciesLatinName(entry.speciesSelection)

const commodityRow = ({ index, name, code, lines }) => ({
  code,
  name,
  latinNames: lines.map(latinNameOf),
  lines,
  groupIndex: index,
  perSpecies: false
})

const speciesRows = ({ index, name, code, lines }) =>
  lines.map((line) => ({
    code,
    name: commodities.speciesCommonName(name, line.entry.speciesSelection),
    latinNames: [latinNameOf(line)],
    lines: [line],
    groupIndex: index,
    perSpecies: true
  }))

export const buildSelectedCommodityRows = (lines) =>
  buildCommodityGroups(lines).flatMap((group) =>
    commodities.speciesListedIndividually(group.name)
      ? speciesRows(group)
      : [commodityRow(group)]
  )

const speciesHtml = (latinNames) => latinNames.map(escapeHtml).join(',<br>')

const selectedCommodityCells = ({ code, name, latinNames }) => [
  wrappingCell({ text: code }),
  wrappingCell({ text: name }),
  wrappingCell({ html: speciesHtml(latinNames) })
]

export const buildSelectedCommoditiesTable = (rows, headings) => ({
  head: [headings.commodityCode, headings.commonName, headings.species].map(
    (text) => wrappingCell({ text })
  ),
  rows: rows.map(selectedCommodityCells)
})

const ACTIONS_CELL_CLASSES = 'govuk-!-text-align-right'

const hiddenText = (text) =>
  `<span class="govuk-visually-hidden">${escapeHtml(text)}</span>`

const actionsHeading = (headings) => ({
  html: hiddenText(headings.actionsHidden)
})

const actionsCell = (html) => ({ html, classes: ACTIONS_CELL_CLASSES })

const hiddenNameOf = (row) => hiddenText(` ${row.name}`)

const removeButton = (row, copy) =>
  `<button type="submit" class="govuk-link app-link-button" name="action" value="${escapeHtml(row.removeAction)}">${escapeHtml(copy.remove)}${hiddenNameOf(row)}</button>`

const changeLink = (row, copy, changeHref) =>
  `<a class="govuk-link" href="${escapeHtml(changeHref)}">${escapeHtml(copy.change)}${hiddenNameOf(row)}</a>`

export const buildRemovableCommoditiesTable = (rows, headings, copy) => {
  const table = buildSelectedCommoditiesTable(rows, headings)
  return {
    head: [...table.head, actionsHeading(headings)],
    rows: table.rows.map((cells, position) => [
      ...cells,
      actionsCell(removeButton(rows[position], copy))
    ])
  }
}

export const buildChangeableCommoditiesTable = (
  rows,
  headings,
  copy,
  changeHref
) => {
  const table = buildSelectedCommoditiesTable(rows, headings)
  return {
    head: [
      ...table.head,
      { text: headings.numberOfAnimals },
      actionsHeading(headings)
    ],
    rows: table.rows.map((cells, position) => [
      ...cells,
      { text: rows[position].animals },
      actionsCell(changeLink(rows[position], copy, changeHref))
    ])
  }
}
