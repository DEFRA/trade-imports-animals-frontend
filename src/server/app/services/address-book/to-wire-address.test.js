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
        countryCode: 'FR'
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

  it('Should carry the ISO code through unchanged when it is already the wire name', () => {
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

  it('Should leave countryCode undefined when the source carries none', () => {
    expect(
      toWireAddress({ addressLine1: '3 Nowhere St' }).countryCode
    ).toBeUndefined()
  })

  it('Should ignore a display-name country field — every persistence source now writes countryCode directly', () => {
    // Cross-checks the removal of the old reverse lookup (address.country ??
    // countryCodeFrom(address.country)). Sources that still carry a display
    // name for rendering (address-book records, private-transporter answers)
    // also carry countryCode, so the mapper reads the code and ignores the
    // name.
    expect(
      toWireAddress({ country: 'France', countryCode: 'FR' }).countryCode
    ).toBe('FR')
    expect(toWireAddress({ country: 'France' }).countryCode).toBeUndefined()
  })

  it('Should map an empty address without throwing', () => {
    const wire = toWireAddress()
    expect(wire.addressLine1).toBeUndefined()
    expect(wire.addressLine2).toBeUndefined()
    expect(wire.townOrCity).toBeUndefined()
    expect(wire.county).toBeUndefined()
    expect(wire.postcode).toBeUndefined()
    expect(wire.countryCode).toBeUndefined()
  })
})
