import { describe, expect, it } from 'vitest'

import { originLabel } from '../../../../../../services/countries/index.js'
import { frozenPartiesOf } from './frozen-parties.js'

const frozen = {
  placeOfOrigin: {
    addressId: 'origin-1',
    name: 'Origin Farm',
    phone: '01228 555 0001',
    email: 'origin@example.co.uk',
    address: {
      addressLine1: '1 Farm Lane',
      townOrCity: 'Ennis',
      postcode: 'V95 ABC',
      countryCode: 'IE'
    }
  },
  consignor: { name: 'Frozen Consignor' },
  destination: { name: 'Frozen Destination' },
  consignment: { name: 'Frozen Contact' }
}

describe('frozenPartiesOf', () => {
  it('Should key destination and consignment by their journey ids', () => {
    const parties = frozenPartiesOf(frozen)

    expect(parties.placeOfDestination).toMatchObject({
      name: 'Frozen Destination'
    })
    expect(parties.contactAddress).toMatchObject({ name: 'Frozen Contact' })
    expect(parties.placeOfOrigin).toMatchObject({ name: 'Origin Farm' })
    expect(parties.consignor).toMatchObject({ name: 'Frozen Consignor' })
  })

  it('Should map the freeze address names onto the journey address shape', () => {
    const { placeOfOrigin } = frozenPartiesOf(frozen)

    expect(placeOfOrigin.address).toMatchObject({
      addressLine1: '1 Farm Lane',
      townOrCity: 'Ennis',
      postalOrZipCode: 'V95 ABC',
      telephoneNumber: '01228 555 0001',
      emailAddress: 'origin@example.co.uk'
    })
    expect(placeOfOrigin.address.country).toBe(originLabel('IE') ?? 'IE')
  })

  it('Should map a known country code to its origin label', () => {
    const { placeOfOrigin } = frozenPartiesOf({
      placeOfOrigin: {
        name: 'French Farm',
        address: { countryCode: 'FR' }
      }
    })

    expect(placeOfOrigin.address.country).toBe(originLabel('FR') ?? 'FR')
  })

  it('Should fall back to the raw country code when the label is unknown', () => {
    const { placeOfOrigin } = frozenPartiesOf({
      placeOfOrigin: {
        name: 'Unknown Farm',
        address: { countryCode: 'XX' }
      }
    })

    expect(placeOfOrigin.address.country).toBe('XX')
  })

  it('Should treat a nameless frozen role as unanswered', () => {
    expect(
      frozenPartiesOf({ consignor: { addressId: 'gone' } }).consignor
    ).toBeUndefined()
  })
})
