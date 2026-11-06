import { lineKey } from '../selection/line-key.js'
import { resultRows } from '../selection/rows.js'
import { legendHtmlFor, speciesLabelHtml } from './labels.js'
import { inLegendOrder, inSpeciesLabelOrder } from './result-order.js'

const itemFor = (row, selected, query) => {
  const key = lineKey(row)
  return {
    value: key,
    html: speciesLabelHtml(row, query),
    checked: selected.includes(key)
  }
}

export const commodityGroups = (results, selected, query = '') => {
  const rowsByCode = Map.groupBy(
    resultRows(results),
    (row) => row.commodityCode
  )
  return inLegendOrder([...rowsByCode.keys()]).map((commodityCode) => ({
    legendHtml: legendHtmlFor(commodityCode, query),
    items: inSpeciesLabelOrder(rowsByCode.get(commodityCode)).map((row) =>
      itemFor(row, selected, query)
    )
  }))
}
