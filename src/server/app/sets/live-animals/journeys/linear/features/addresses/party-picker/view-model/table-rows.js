import { renderMacro } from '../../../../../../../../shared/render-macro.js'

const CELLS_TEMPLATE =
  'live-animals/journeys/linear/features/addresses/party-picker/_cells.njk'

const viewCells = (row, copy, withViewLinks) =>
  withViewLinks
    ? [{ html: renderMacro(CELLS_TEMPLATE, 'pickerViewCell', row, copy) }]
    : []

export const pickerTableRows = (rows, copy, { withViewLinks }) =>
  rows.map((row) => [
    { html: renderMacro(CELLS_TEMPLATE, 'pickerSelectCell', row, copy) },
    { text: row.name },
    { html: renderMacro(CELLS_TEMPLATE, 'pickerAddressCell', row) },
    { text: row.country },
    ...viewCells(row, copy, withViewLinks)
  ])
