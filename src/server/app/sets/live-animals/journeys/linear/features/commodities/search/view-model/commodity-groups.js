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

export const commodityGroups = (results, selected) =>
  [...Map.groupBy(resultRows(results), (row) => row.commodityCode)].map(
    ([commodityCode, rows]) => ({
      legend: legendFor(commodityCode),
      items: rows.map((row) => itemFor(row, selected))
    })
  )
