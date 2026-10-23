import { renderMacro } from '../../../../../../../../shared/render-macro.js'

const CELLS_TEMPLATE =
  'live-animals/journeys/linear/features/addresses/party-picker/_cells.njk'

export const pickerTableRows = (rows, copy) =>
  rows.map((row) => [
    { html: renderMacro(CELLS_TEMPLATE, 'pickerSelectCell', row, copy) },
    { text: row.name },
    { text: row.addressText },
    { text: row.country },
    { html: renderMacro(CELLS_TEMPLATE, 'pickerDetailsCell', row, copy) }
  ])
