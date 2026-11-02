export const commodityLinesFixture = (...rowAndCounts) =>
  rowAndCounts.map(([row, numberOfAnimalsQuantity], index) => ({
    index,
    entry: { ...row, numberOfAnimalsQuantity }
  }))
