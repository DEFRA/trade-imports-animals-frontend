import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { lineKey } from '../selection/line-key.js'
import { removeActionFor } from '../selection/remove-action.js'
import { commodityLabel } from '../../commodity-label.js'

const copy = copyFor({ en, cy }).search

const itemFor = (row, legend) => ({
  label: row.speciesLatinName,
  removeLabel: copy.selected.remove(row.speciesLatinName, legend),
  removeAction: removeActionFor(lineKey(row))
})

const groupFor = ([commodityCode, rowsForCode]) => {
  const legend = commodityLabel(commodityCode)
  return {
    legend,
    items: rowsForCode.map((row) => itemFor(row, legend))
  }
}

const groupsFor = (rows) =>
  [...Map.groupBy(rows, (row) => row.commodityCode)].map(groupFor)

export const selectedSummary = (rows) => ({
  count: rows.length,
  heading: copy.selected.heading(rows.length),
  groups: groupsFor(rows)
})
