import { FELIS_CATUS_ROW } from './journeys/linear/features/commodities/search/test-support.js'

export const seedWithCommodityLineOfAnimals = (count) => ({
  commodityLines: [
    {
      ...FELIS_CATUS_ROW,
      numberOfAnimalsQuantity: String(count),
      numberOfPackages: ''
    }
  ]
})
