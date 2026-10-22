import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { isSearchable } from '../matching.js'
import { commodityGroups } from './commodity-groups.js'
import { selectedSummary } from './selected-summary.js'

const copy = copyFor({ en, cy }).search

const resultStatusFor = (query, resultCount) => {
  if (!isSearchable(query)) {
    return ''
  }
  return resultCount === 0 ? copy.noResults : copy.resultCount(resultCount)
}

/**
 * Everything the page shows for a query and a selection: the matching groups,
 * the selection keys that have no tick box among them, the selection panel and
 * the sentence that reports how many results there are.
 *
 * @param {string[]} selected - the selection keys already chosen.
 * @param {string} query - what the trader typed into the search box.
 * @returns {{commodityGroups: object[], noResults: boolean, carriedKeys: string[], selectedSummary: object, resultStatus: string}} the results view model.
 */
export const searchResults = (selected, query) => {
  const groups = commodityGroups(selected, query)
  const onScreen = new Set(
    groups.flatMap((group) => group.items.map((item) => item.value))
  )
  const resultCount = groups.reduce(
    (total, group) => total + group.items.length,
    0
  )
  return {
    commodityGroups: groups,
    noResults: isSearchable(query) && groups.length === 0,
    carriedKeys: selected.filter((key) => !onScreen.has(key)),
    selectedSummary: selectedSummary(selected),
    resultStatus: resultStatusFor(query, resultCount)
  }
}
