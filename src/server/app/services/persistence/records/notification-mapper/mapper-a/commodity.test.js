import { describe, expect, test } from 'vitest'
import { commoditiesFromLinesA } from './commodity.js'

describe('commoditiesFromLinesA', () => {
  test('Should return undefined when there are no lines', () => {
    expect(commoditiesFromLinesA(undefined)).toBeUndefined()
    expect(commoditiesFromLinesA([])).toBeUndefined()
  })

  test('Should resolve commonName from the catalogue when only commodity code and species value are given', () => {
    expect(
      commoditiesFromLinesA([
        {
          commodityCode: '0102',
          speciesSelection: '1148346',
          commodityType: '16',
          numberOfPackages: '1',
          numberOfAnimalsQuantity: '1',
          animalIdentifiers: [{ animalIdentifierEarTag: 'UK1' }]
        }
      ])
    ).toEqual([
      expect.objectContaining({
        name: 'Cow',
        commodityCode: '0102',
        description: 'Live bovine animals',
        species: [
          expect.objectContaining({
            value: '1148346',
            text: 'Bos taurus',
            commonName: 'Domestic cattle'
          })
        ]
      })
    ])
  })

  test('Should keep an explicit commonName on the line', () => {
    expect(
      commoditiesFromLinesA([
        {
          commodityCode: '0102',
          speciesLatinName: 'Bos taurus',
          commonName: 'Registered herd name',
          numberOfAnimalsQuantity: '1'
        }
      ])[0].species[0].commonName
    ).toBe('Registered herd name')
  })
})
