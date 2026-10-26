export const commodityLinesFixture = (...lines) =>
  lines.map(([row, numberOfAnimalsQuantity], index) => ({
    index,
    entry: { ...row, numberOfAnimalsQuantity }
  }))
