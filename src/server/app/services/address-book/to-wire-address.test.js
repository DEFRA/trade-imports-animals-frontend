import { describe, expect, it } from 'vitest'

import { toWireAddress } from './to-wire-address.js'

describe('#toWireAddress', () => {
  it('Should translate the journey address names onto the wire names', () => {
    expect(
      toWireAddress({
        addressLine1: '1 Farm Lane',
        addressLine2: 'Upper Field',
        townOrCity: 'Rouen',
        county: 'Normandy',
        postalOrZipCode: '76000',
        country: 'France'
      })
    ).toEqual({
      addressLine1: '1 Farm Lane',
      addressLine2: 'Upper Field',
      townOrCity: 'Rouen',
      county: 'Normandy',
      postcode: '76000',
      countryCode: 'FR'
    })
  })

  it('Should map United Kingdom to GB', () => {
    expect(toWireAddress({ country: 'United Kingdom' }).countryCode).toBe('GB')
  })

  it('Should keep an address that is already in wire shape', () => {
    expect(
      toWireAddress({
        addressLine1: '2 Depot Road',
        postcode: 'AB1 2CD',
        countryCode: 'IE'
      })
    ).toMatchObject({
      addressLine1: '2 Depot Road',
      postcode: 'AB1 2CD',
      countryCode: 'IE'
    })
  })

  it('Should keep an unrecognised country code left on country', () => {
    expect(toWireAddress({ country: 'ZZ' }).countryCode).toBe('ZZ')
  })

  it('Should leave the country code out for a name it does not recognise', () => {
    expect(toWireAddress({ country: 'Atlantis' }).countryCode).toBeUndefined()
  })

  it('Should map an empty address without throwing', () => {
    expect(toWireAddress()).toEqual({})
  })
})
