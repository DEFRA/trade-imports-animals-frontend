import * as commodities from '../../../../../../services/commodities/index.js'
import { isSearchable, matchesCode, matchesWords } from '../matching.js'
import { legendFor } from './legend.js'

const commodityMatches = (name, query) =>
  matchesWords(name, query) ||
  matchesCode(commodities.commodityCodeFor(name), query)

// Name or code hits the whole commodity, so every species under it stays in
// the results; otherwise only the species that match on their own.
const speciesMatching = (name, query) =>
  commodityMatches(name, query)
    ? commodities.speciesFor(name)
    : commodities
        .speciesFor(name)
        .filter((option) => matchesWords(option.text, query))

const itemsFor = (name, query, selected) =>
  speciesMatching(name, query).map((option) => {
    const key = `${name}|${option.value}`
    return {
      value: key,
      text: option.text,
      checked: selected.includes(key)
    }
  })

/**
 * The results panel: the commodities whose species the query reaches, each with
 * a tick box per matching species. Empty until the query is long enough — the
 * page lists nothing of its own accord.
 *
 * @param {string[]} selected - the selection keys already chosen.
 * @param {string} query - what the trader typed into the search box.
 * @returns {Array<{legend: string, items: object[]}>} the matching groups.
 */
export const commodityGroups = (selected, query) => {
  if (!isSearchable(query)) {
    return []
  }
  return commodities
    .list()
    .map((name) => ({
      legend: legendFor(name),
      items: itemsFor(name, query, selected)
    }))
    .filter((group) => group.items.length > 0)
}
