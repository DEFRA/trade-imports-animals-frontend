import { lineKey } from '../selection/line-key.js'
import { resultRows } from '../selection/rows.js'
import { legendFor, speciesLabelFor } from './labels.js'

const itemFor = (row, selected) => {
  const key = lineKey(row)
  return {
    value: key,
    text: speciesLabelFor(row.speciesLatinName),
    checked: selected.includes(key)
  }
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
  [...Map.groupBy(resultRows(results), (row) => row.commodityCode)].map(
    ([commodityCode, rows]) => ({
      legend: legendFor(commodityCode),
      items: rows.map((row) => itemFor(row, selected))
    })
  )
