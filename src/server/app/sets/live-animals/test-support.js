import { commodityLine } from '../../engine/test-support.js'
import {
  BOS_TAURUS_ROW,
  FELIS_CATUS_ROW,
  lineOf
} from './journeys/linear/features/commodities/search/test-support.js'

export const originSaved = { countryOfOrigin: 'FR' }

export const withOriginSaved = (seed) => ({ ...originSaved, ...seed })

export const requiredEarlierAnswers = () =>
  withOriginSaved({ commodityLines: [commodityLine()] })

export const seedFromFranceWithCommodityLineOfAnimals = (count) =>
  withOriginSaved({
    commodityLines: [
      {
        ...FELIS_CATUS_ROW,
        numberOfAnimalsQuantity: String(count),
        numberOfPackages: ''
      }
    ]
  })

export const seedFromFranceWithOneEarTaggedCattle = () =>
  withOriginSaved({
    commodityLines: [
      lineOf(BOS_TAURUS_ROW, {
        numberOfAnimalsQuantity: '1',
        animalIdentifiers: [{ animalIdentifierEarTag: 'UK1' }]
      })
    ]
  })
