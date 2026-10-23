export const commodityLinesFixture = (...triples) =>
  triples.map(
    (
      [commoditySelection, speciesSelection, numberOfAnimalsQuantity],
      index
    ) => ({
      index,
      entry: { commoditySelection, speciesSelection, numberOfAnimalsQuantity }
    })
  )
