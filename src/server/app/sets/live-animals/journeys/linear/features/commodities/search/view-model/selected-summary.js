import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { codeAndLatinNameOf } from '../selection/line-key.js'
import { removeActionFor } from '../selection/remove-action.js'
import { speciesLabel } from '../../species-label.js'
import { legendFor } from '../../commodity-legend.js'
import { removeActionButton } from '../../../../../../../../../common/constants/table-cells.js'

const copy = copyFor({ en, cy }).search

const itemFor = (key) => {
  const label = speciesLabel({ speciesLatinName: codeAndLatinNameOf(key)[1] })
  return {
    label,
    removeHtml: removeActionButton({
      action: removeActionFor(key),
      text: copy.selected.remove,
      hiddenText: label
    })
  }
}

const groupsFor = (selected) =>
  [...Map.groupBy(selected, (key) => codeAndLatinNameOf(key)[0])].map(
    ([commodityCode, keys]) => ({
      legend: legendFor(commodityCode),
      items: keys.map(itemFor)
    })
  )

export const selectedSummary = (selected) => ({
  count: selected.length,
  heading: copy.selected.heading(selected.length),
  groups: groupsFor(selected)
})
