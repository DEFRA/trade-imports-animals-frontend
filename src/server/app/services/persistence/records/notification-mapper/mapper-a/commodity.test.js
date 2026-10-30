import { describe, expect, test } from 'vitest'
import {
  CATTLE_CODE,
  OTHER_LIVE_MAMMALS_CODE
} from '../../../../../sets/live-animals/services/commodities/rules.js'
import { commoditiesFromLinesA } from './commodity.js'

const BOS_TAURUS = 'Bos taurus'

describe('commoditiesFromLinesA', () => {
  test('Should return undefined when there are no lines', () => {
    expect(commoditiesFromLinesA(undefined)).toBeUndefined()
    expect(commoditiesFromLinesA([])).toBeUndefined()
  })

  test('Should persist the common name the user was shown when the line has no commonName', () => {
    expect(
      commoditiesFromLinesA([
        {
          commodityCode: CATTLE_CODE,
          speciesLatinName: BOS_TAURUS,
          speciesCommonName: 'Domestic Cattle',
          commodityType: '16',
          numberOfPackages: '1',
          numberOfAnimalsQuantity: '1',
          animalIdentifiers: [{ animalIdentifierEarTag: 'UK1' }]
        }
      ])[0].species[0].commonName
    ).toBe('Domestic Cattle')
  })

  test('Should save a dog under 01061900 with the code as its commodity name', () => {
    const [commodity] = commoditiesFromLinesA([
      {
        commodityCode: OTHER_LIVE_MAMMALS_CODE,
        speciesLatinName: 'Canis familiaris',
        speciesCommonName: 'Dog',
        numberOfAnimalsQuantity: '1'
      }
    ])

    expect(commodity.name).toBe(OTHER_LIVE_MAMMALS_CODE)
    expect(commodity.species[0].commonName).toBe('Dog')
  })

  test('Should omit commonName when the line was saved with none', () => {
    expect(
      commoditiesFromLinesA([
        {
          commodityCode: CATTLE_CODE,
          speciesLatinName: BOS_TAURUS,
          numberOfAnimalsQuantity: '1'
        }
      ])[0].species[0].commonName
    ).toBeUndefined()
  })

  test('Should keep an explicit commonName on the line', () => {
    expect(
      commoditiesFromLinesA([
        {
          commodityCode: CATTLE_CODE,
          speciesLatinName: BOS_TAURUS,
          commonName: 'Registered herd name',
          numberOfAnimalsQuantity: '1'
        }
      ])[0].species[0].commonName
    ).toBe('Registered herd name')
  })
})
