export const groupLinesByCommodityCode = (lines) =>
  Object.values(Object.groupBy(lines, (line) => line.commodityCode))
