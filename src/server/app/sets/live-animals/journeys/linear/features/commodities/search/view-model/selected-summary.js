import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { splitKey } from '../selection/keys.js'

const copy = copyFor({ en, cy }).search

// The panel names a chosen species the same way its tick box did — by its
// scientific name, under its CN code — so the two halves of the page do not
// drift apart.
const groupsFor = (selected) =>
  [...Map.groupBy(selected.map(splitKey), ([code]) => code)].map(
    ([code, pairs]) => ({
      legend: code,
      items: pairs.map(([, latinName]) => latinName)
    })
  )

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
