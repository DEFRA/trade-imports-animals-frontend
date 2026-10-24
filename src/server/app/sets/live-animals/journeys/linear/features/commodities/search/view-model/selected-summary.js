import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { codeAndLatinNameOf } from '../selection/line-key.js'
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
 * The chosen species, counted and grouped by commodity code in the order given.
 *
 * @param {string[]} selected - the selection keys already chosen.
 * @returns {{count: number, heading: string, groups: Array<{legend: string, items: string[]}>}} the panel view model.
 */
export const selectedSummary = (selected) => ({
  count: selected.length,
  heading: copy.selected.heading(selected.length),
  groups: groupsFor(selected)
})
