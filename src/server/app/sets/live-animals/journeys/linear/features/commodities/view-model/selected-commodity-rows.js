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
