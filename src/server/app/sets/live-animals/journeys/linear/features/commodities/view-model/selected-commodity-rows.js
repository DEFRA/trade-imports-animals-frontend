import * as commodities from '../../../../../services/commodities/index.js'
import {
  actionsCell,
  hiddenActionsHeading,
  removeActionCell,
  visuallyHiddenText,
  wrappingCell
} from '../../../../../../../../common/constants/table-cells.js'
import { escapeHtml } from '../../../../../../../shared/escape-html.js'
import { speciesLabel } from '../species-label.js'
import { buildCommodityGroups } from './commodity-groups.js'

const labelOf = ({ entry }) => speciesLabel(entry)

const commodityRow = ({ code, lines }) => ({
  code,
  labels: lines.map(labelOf),
  lines,
  perSpecies: false
})

const speciesRows = ({ code, lines }) =>
  lines.map((line) => ({
    code,
    labels: [labelOf(line)],
    lines: [line],
    perSpecies: true
  }))

export const buildSelectedCommodityRows = (lines) =>
  buildCommodityGroups(lines).flatMap((group) =>
    commodities.listsSpeciesIndividually(group.code)
      ? speciesRows(group)
      : [commodityRow(group)]
  )

const speciesHtml = (labels) => labels.map(escapeHtml).join(',<br>')

const selectedCommodityCells = ({ code, labels }) => [
  wrappingCell({ text: code }),
  wrappingCell({ html: speciesHtml(labels) })
]

export const buildSelectedCommoditiesTable = (rows, headings) => ({
  head: [headings.commodityCode, headings.species].map((text) =>
    wrappingCell({ text })
  ),
  rows: rows.map(selectedCommodityCells)
})

const rowLabel = ({ code, labels }) => `${code} ${labels.join(', ')}`

const changeLink = (row, copy, changeHref) => {
  const hiddenName = visuallyHiddenText(` ${rowLabel(row)}`)
  return `<a class="govuk-link" href="${escapeHtml(changeHref)}">${escapeHtml(copy.change)}${hiddenName}</a>`
}

export const buildRemovableCommoditiesTable = (rows, headings, copy) => {
  const table = buildSelectedCommoditiesTable(rows, headings)
  return {
    head: [...table.head, hiddenActionsHeading(headings.actionsHidden)],
    rows: table.rows.map((cells, position) => [
      ...cells,
      removeActionCell({
        action: rows[position].removeAction,
        text: copy.remove,
        hiddenText: rowLabel(rows[position])
      })
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
      hiddenActionsHeading(headings.actionsHidden)
    ],
    rows: table.rows.map((cells, position) => [
      ...cells,
      { text: rows[position].animals },
      actionsCell(changeLink(rows[position], copy, changeHref))
    ])
  }
}
