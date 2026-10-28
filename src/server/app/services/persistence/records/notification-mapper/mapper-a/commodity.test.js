import { describe, expect, test } from 'vitest'
import { CATTLE_CODE } from '../../../../../sets/live-animals/services/commodities/rules.js'
import { commoditiesFromLinesA } from './commodity.js'

const BOS_TAURUS = 'Bos taurus'

describe('commoditiesFromLinesA', () => {
  test('Should return undefined when there are no lines', () => {
    expect(commoditiesFromLinesA(undefined)).toBeUndefined()
    expect(commoditiesFromLinesA([])).toBeUndefined()
  })

  test('Should resolve commonName from the catalogue when commodity code and latin name are given', () => {
    expect(
      commoditiesFromLinesA([
        {
          commodityCode: CATTLE_CODE,
          speciesLatinName: BOS_TAURUS,
          commodityType: '16',
          numberOfPackages: '1',
          numberOfAnimalsQuantity: '1',
          animalIdentifiers: [{ animalIdentifierEarTag: 'UK1' }]
        }
      ])
    ).toEqual([
      expect.objectContaining({
        name: 'Cow',
        commodityCode: CATTLE_CODE,
        description: 'Live bovine animals',
        species: [
          expect.objectContaining({
            value: BOS_TAURUS,
            text: BOS_TAURUS,
            commonName: 'Cattle or Cow'
          })
        ]
      })
    ])
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
