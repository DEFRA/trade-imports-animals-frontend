import { describe, expect, it } from 'vitest'

import {
  commodityGroups,
  countries,
  countriesOrigin,
  countriesOriginEntries,
  countryAndSubdivisionEntriesNamedWithCountry,
  portsOfEntry
} from './fixtures.js'

describe('#captured reference fixtures', () => {
  it('Should load countries-origin as { code, name, subDivisions } entries', () => {
    expect(countriesOrigin).toContainEqual({
      code: 'AT',
      name: 'Austria',
      subDivisions: []
    })
  })

  it('Should load the unfiltered countries as the full reference-data list, beyond the SPS block', () => {
    expect(countries).toContainEqual({
      code: 'JE',
      name: 'Jersey',
      subDivisions: []
    })
    expect(countries.some(({ code }) => code === 'GB')).toBe(false)
  })

  it('Should load ports-of-entry as { code, name, type } entries', () => {
    expect(portsOfEntry).toContainEqual({
      code: 'GB ABD',
      name: 'Aberdeen Harbour',
      type: 'seaport'
    })
  })

  it('Should flatten country options with each subdivision named with its country, sorted by name', () => {
    const entries = countryAndSubdivisionEntriesNamedWithCountry()
    expect(entries).toContainEqual({
      code: 'ES-CN',
      name: 'Canary Islands (Spain)'
    })
    expect(entries.length).toBeGreaterThan(countriesOriginEntries().length)
    const names = entries.map(({ name }) => name)
    expect(names).toEqual(
      [...names].sort((left, right) => left.localeCompare(right))
    )
  })

  it('Should load commodities as { code, species } groups holding the pinned vocabulary of codes, Latin names and common names', () => {
    const pinnedSpecies = [
      { code: '0101', latinName: 'Equus cabalus', commonName: 'Horse' },
      { code: '0102', latinName: 'Bos taurus', commonName: 'Domestic Cattle' },
      { code: '0102', latinName: 'Bison bison', commonName: 'American Bison' },
      {
        code: '0102',
        latinName: 'Bubalus bubalis',
        commonName: 'Water Buffalo'
      },
      {
        code: '01051111',
        latinName: 'Gallus gallus',
        commonName: 'Chicken'
      },
      {
        code: '01061900',
        latinName: 'Felis catus',
        commonName: 'Domestic Cat'
      },
      {
        code: '01061900',
        latinName: 'Nyctereutes procyonoides',
        commonName: 'Raccoon Dog'
      },
      {
        code: '01061900',
        latinName: 'Mustela putorius furo',
        commonName: 'Ferret'
      },
      { code: '01063300', latinName: 'Struthio spp.', commonName: 'Ostriches' }
    ]
    for (const { code, latinName, commonName } of pinnedSpecies) {
      expect(commodityGroups).toContainEqual({
        code,
        species: expect.arrayContaining([{ latinName, commonName }])
      })
    }
  })
})
