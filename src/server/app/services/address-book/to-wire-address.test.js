import { beforeAll, describe, expect, it } from 'vitest'

// Stub-mode short-circuits countries.ensureLoaded, letting the reverse-lookup
// resolve against the seeded stub labels without any network stub.
process.env.STUB_MODE = 'true'

let toWireAddress
beforeAll(async () => {
  ;({ toWireAddress } = await import('./to-wire-address.js'))
})

describe('#toWireAddress', () => {
  it('Should translate the journey address names onto the wire names', async () => {
    expect(
      await toWireAddress({
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

  it('Should map United Kingdom to GB', async () => {
    expect(
      (await toWireAddress({ country: 'United Kingdom' })).countryCode
    ).toBe('GB')
  })

  it('Should keep an address that is already in wire shape', async () => {
    expect(
      await toWireAddress({
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

  it('Should keep an unrecognised country code left on country', async () => {
    expect((await toWireAddress({ country: 'ZZ' })).countryCode).toBe('ZZ')
  })

  it('Should leave the country code out for a name it does not recognise', async () => {
    expect(
      (await toWireAddress({ country: 'Atlantis' })).countryCode
    ).toBeUndefined()
  })

  it('Should map an empty address without throwing', async () => {
    expect(await toWireAddress()).toEqual({})
  })
})
