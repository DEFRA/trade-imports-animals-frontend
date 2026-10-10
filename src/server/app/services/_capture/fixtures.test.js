import { describe, expect, it } from 'vitest'

import {
  countries,
  countriesOrigin,
  countriesOriginEntries,
  destinationPageCountryEntries,
  originPageCountryEntries,
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
    expect(countries).toHaveLength(249)
    expect(countries.some(({ code }) => code === 'GB')).toBe(false)
  })

  it('Should load ports-of-entry as { code, name, type } entries', () => {
    expect(portsOfEntry).toContainEqual({
      code: 'GB ABD',
      name: 'Aberdeen Harbour',
      type: 'seaport'
    })
  })

  it('Should hold the captured ports airports first, then seaports, then rail ports', () => {
    const PORT_TYPE_ORDER = ['airport', 'seaport', 'rail']
    const ranks = portsOfEntry.map(({ type }) => PORT_TYPE_ORDER.indexOf(type))

    expect(ranks).not.toContain(-1)
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b))
  })

  it('Should flatten origin-page country options with subdivisions sorted by name', () => {
    expect(originPageCountryEntries()).toContainEqual({
      code: 'ES-CN',
      name: 'Canary Islands'
    })
    expect(originPageCountryEntries().length).toBeGreaterThan(
      countriesOriginEntries().length
    )
  })

  it('Should flatten destination-page country options with each subdivision named with its parent', () => {
    expect(destinationPageCountryEntries()).toContainEqual({
      code: 'ES-CN',
      name: 'Canary Islands (Spain)'
    })
    expect(destinationPageCountryEntries()).toHaveLength(
      originPageCountryEntries().length
    )
  })
})
