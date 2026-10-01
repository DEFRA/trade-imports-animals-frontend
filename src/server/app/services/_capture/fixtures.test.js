import { describe, expect, it } from 'vitest'

import {
  countriesOrigin,
  countriesOriginEntries,
  originPageCountryEntries,
  portsOfEntry
} from './fixtures.js'

describe('#captured reference fixtures', () => {
  it('Should load countries-origin as { code, name } entries', () => {
    expect(countriesOrigin).toContainEqual({
      code: 'AT',
      name: 'Austria',
      subDivisions: []
    })
  })

  it('Should load ports-of-entry as { code, name } entries', () => {
    expect(portsOfEntry).toContainEqual({
      code: 'GB ABD',
      name: 'Aberdeen Harbour'
    })
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
})
