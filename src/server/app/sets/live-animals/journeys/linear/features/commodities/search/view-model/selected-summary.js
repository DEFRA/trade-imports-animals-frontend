import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { lineKey } from '../selection/line-key.js'
import { removeActionFor } from '../selection/remove-action.js'
import { namedLegendFor } from '../../commodity-legend.js'

const copy = copyFor({ en, cy }).search

const itemFor = (row) => ({
  label: row.speciesLatinName,
  removeAction: removeActionFor(lineKey(row))
})

const groupsFor = (rows) =>
  [...Map.groupBy(rows, (row) => row.commodityCode)].map(
    ([commodityCode, rowsForCode]) => ({
      legend: namedLegendFor(commodityCode),
      items: rowsForCode.map(itemFor)
    })
  )

export const selectedSummary = (rows) => ({
  count: rows.length,
  heading: copy.selected.heading(rows.length),
  groups: groupsFor(rows)
})
