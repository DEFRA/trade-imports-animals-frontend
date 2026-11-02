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

  it('Should load commodities as { code, species } groups, each species a Latin and common name', () => {
    expect(commodityGroups).toContainEqual({
      code: '0101',
      species: expect.arrayContaining([
        { latinName: 'Equus cabalus', commonName: 'Horse' }
      ])
    })
  })
})
