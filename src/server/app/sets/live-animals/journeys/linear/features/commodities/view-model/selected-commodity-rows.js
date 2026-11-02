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

const latinNameOf = ({ entry }) => speciesLabel(entry)

const commodityRow = ({ index, code, lines }) => ({
  code,
  latinNames: lines.map(latinNameOf),
  lines,
  groupIndex: index,
  perSpecies: false
})

const speciesRows = ({ index, code, lines }) =>
  lines.map((line) => ({
    code,
    latinNames: [latinNameOf(line)],
    lines: [line],
    groupIndex: index,
    perSpecies: true
  }))

export const buildSelectedCommodityRows = (lines) =>
  buildCommodityGroups(lines).flatMap((group) =>
    commodities.listsSpeciesIndividually(group.code)
      ? speciesRows(group)
      : [commodityRow(group)]
  )

const speciesHtml = (latinNames) => latinNames.map(escapeHtml).join(',<br>')

const selectedCommodityCells = ({ code, latinNames }) => [
  wrappingCell({ text: code }),
  wrappingCell({ html: speciesHtml(latinNames) })
]

export const buildSelectedCommoditiesTable = (rows, headings) => ({
  head: [headings.commodityCode, headings.species].map((text) =>
    wrappingCell({ text })
  ),
  rows: rows.map(selectedCommodityCells)
})

const rowLabel = ({ code, latinNames }) => `${code} ${latinNames.join(', ')}`

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
