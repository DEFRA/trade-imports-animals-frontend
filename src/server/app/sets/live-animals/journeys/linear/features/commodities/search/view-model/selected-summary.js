import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { codeAndLatinNameOf } from '../selection/keys.js'
import { speciesLabel } from '../../species-label.js'
import { legendFor } from './labels.js'

const copy = copyFor({ en, cy }).search

const groupsFor = (selected) =>
  [
    ...Map.groupBy(
      selected.map(codeAndLatinNameOf),
      ([commodityCode]) => commodityCode
    )
  ].map(([commodityCode, pairs]) => ({
    legend: legendFor(commodityCode),
    items: pairs.map(([, speciesLatinName]) =>
      speciesLabel({ speciesLatinName })
    )
  }))

/**
 * What is on the notification so far, so the trader never has to scroll a
 * results list to find out. Grouped by code in canonical selection order.
 *
 * @param {string[]} selected - the selection keys already chosen.
 * @returns {{count: number, heading: string, groups: Array<{legend: string, items: string[]}>}} the panel view model.
 */
export const selectedSummary = (selected) => ({
  count: selected.length,
  heading: copy.selected.heading(selected.length),
  groups: groupsFor(selected)
})
