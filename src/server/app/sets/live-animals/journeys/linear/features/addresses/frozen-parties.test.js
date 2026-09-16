import { describe, expect, it } from 'vitest'

import { originLabel } from '../../../../../../services/countries/index.js'
import { partiesFromStoredAnswers, toDisplayParty } from './frozen-parties.js'

const stored = {
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
  placeOfDestination: { name: 'Frozen Destination' },
  contactAddress: { name: 'Frozen Contact' }
}

describe('partiesFromStoredAnswers', () => {
  it('Should map stored inline answers onto journey party ids', async () => {
    const parties = await partiesFromStoredAnswers(stored)

    expect(parties.placeOfDestination).toMatchObject({
      name: 'Frozen Destination'
    })
    expect(parties.contactAddress).toMatchObject({ name: 'Frozen Contact' })
    expect(parties.placeOfOrigin).toMatchObject({ name: 'Origin Farm' })
    expect(parties.consignor).toMatchObject({ name: 'Frozen Consignor' })
  })

  it('Should map the stored address names onto the journey address shape', async () => {
    const { placeOfOrigin } = await partiesFromStoredAnswers(stored)

    expect(placeOfOrigin.address).toMatchObject({
      addressLine1: '1 Farm Lane',
      townOrCity: 'Ennis',
      postalOrZipCode: 'V95 ABC',
      telephoneNumber: '01228 555 0001',
      emailAddress: 'origin@example.co.uk'
    })
    expect(placeOfOrigin.address.country).toBe(
      (await originLabel('IE')) ?? 'IE'
    )
  })

  it('Should treat a nameless stored role as unanswered', async () => {
    const parties = await partiesFromStoredAnswers({
      consignor: { addressId: 'gone' }
    })
    expect(parties.consignor).toBeUndefined()
  })
})

describe('toDisplayParty', () => {
  it('Should fall back to the raw country code when the label is unknown', async () => {
    const party = await toDisplayParty({
      name: 'Unknown Farm',
      address: { countryCode: 'XX' }
    })

    expect(party.address.country).toBe('XX')
  })
})
