import { hasAnimalCount } from '../../lines.js'
import { buildSelectedCommodityRows } from '../../view-model/selected-commodity-rows.js'

const sumOfCounts = (lines) =>
  lines.reduce(
    (total, { entry }) => total + Number(entry.numberOfAnimalsQuantity),
    0
  )

const totalAnimalsText = (lines) => {
  const counted = lines.filter(hasAnimalCount)
  return counted.length === 0 ? '' : String(sumOfCounts(counted))
}

export const buildSelectedCommodities = (lines) =>
  buildSelectedCommodityRows(lines).map(
    ({ code, name, latinNames, lines: rowLines }) => ({
      code,
      name,
      latinNames,
      animals: totalAnimalsText(rowLines)
    })
  )
