import { copyFor } from '../../../../../../../../shared/copy.js'
import * as commodities from '../../../../../../services/commodities/index.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { splitKey } from '../selection/keys.js'
import { legendFor } from './legend.js'
import { speciesLabelFor } from './species-label.js'

const copy = copyFor({ en, cy }).search

// The panel names a chosen species the same way its tick box did, so the two
// halves of the page do not drift apart.
const speciesTextFor = (name, value) => {
  const option = commodities
    .speciesFor(name)
    .find((candidate) => candidate.value === value)
  return option ? speciesLabelFor(name, option) : value
}

const groupsFor = (selected) =>
  Object.entries(
    Object.groupBy(selected, (key) => legendFor(splitKey(key)[0]))
  ).map(([legend, keys]) => ({
    legend,
    items: keys.map((key) => speciesTextFor(...splitKey(key)))
  }))

/**
 * What is on the notification so far, so the trader never has to scroll a
 * results list to find out. Grouped by commodity in canonical selection order.
 *
 * @param {string[]} selected - the selection keys already chosen.
 * @returns {{count: number, heading: string, groups: Array<{legend: string, items: string[]}>}} the panel view model.
 */
export const selectedSummary = (selected) => ({
  count: selected.length,
  heading: copy.selected.heading(selected.length),
  groups: groupsFor(selected)
})
