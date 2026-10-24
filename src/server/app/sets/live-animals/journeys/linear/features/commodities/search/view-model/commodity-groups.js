import { lineKey } from '../selection/line-key.js'
import { resultRows } from '../selection/rows.js'
import { speciesLabel } from '../../species-label.js'
import { legendFor } from './labels.js'

const itemFor = (row, selected) => {
  const key = lineKey(row)
  return {
    value: key,
    text: speciesLabel(row),
    checked: selected.includes(key)
  }
}

/**
 * One group per CN code, in the order each code first appears in the results,
 * with a tick box per species; an empty list when results is null.
 *
 * @param {object | null} results - the search page, or null.
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
