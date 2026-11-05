import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { lineKey } from '../selection/line-key.js'
import { removeActionFor } from '../selection/remove-action.js'
import { speciesLabel } from '../../species-label.js'
import { legendFor } from '../../commodity-legend.js'
import { removeActionButton } from '../../../../../../../../../common/constants/table-cells.js'

const copy = copyFor({ en, cy }).search

const itemFor = (row) => {
  const label = speciesLabel(row)
  return {
    label,
    removeHtml: removeActionButton({
      action: removeActionFor(lineKey(row)),
      text: copy.selected.remove,
      hiddenText: label
    })
  }
}

const groupsFor = (rows) =>
  [...Map.groupBy(rows, (row) => row.commodityCode)].map(
    ([commodityCode, rowsForCode]) => ({
      legend: legendFor(commodityCode),
      items: rowsForCode.map(itemFor)
    })
  )

export const selectedSummary = (rows) => ({
  count: rows.length,
  heading: copy.selected.heading(rows.length),
  groups: groupsFor(rows)
})
