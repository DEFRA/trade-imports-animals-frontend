import { rowKey } from '../selection/keys.js'
import { resultRows } from '../selection/rows.js'

// Each tick box shows the species' scientific name only, under a heading of
// its CN code.
const itemFor = (row, selected) => {
  const key = rowKey(row)
  return { value: key, text: row.latinName, checked: selected.includes(key) }
}

/**
 * The results panel: one group per CN code in the search results, each with a
 * tick box per species, in the order reference-data returned them.
 *
 * @param {object | null} results - the search results, or null before a search.
 * @param {string[]} selected - the selection keys already chosen.
 * @returns {Array<{legend: string, items: object[]}>} the result groups.
 */
export const commodityGroups = (results, selected) =>
  [...Map.groupBy(resultRows(results), (row) => row.code)].map(
    ([code, rows]) => ({
      legend: code,
      items: rows.map((row) => itemFor(row, selected))
    })
  )
