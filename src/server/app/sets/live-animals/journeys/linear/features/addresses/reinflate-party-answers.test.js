import { afterEach, describe, expect, it, vi } from 'vitest'

import * as resolvePartiesModule from './resolve-parties.js'
import { reinflatePartyAnswers } from './reinflate-party-answers.js'

const record = (id, name) => ({
  id,
  name,
  address: {
    addressLine1: '1 Test Street',
    townOrCity: 'London',
    postalOrZipCode: 'SW1A 1AA',
    country: 'United Kingdom',
    telephoneNumber: '01632 960000',
    emailAddress: 'test@example.com'
  }
})

const requestFor = () => ({
  auth: { credentials: { organisationId: '5900001' } },
  app: {}
})

afterEach(() => vi.restoreAllMocks())

const ORIGIN_ID = 'origin-1'
const CONSIGNOR_ID = 'consignor-1'
const CONSIGNEE_ID = 'consignee-1'
const IMPORTER_ID = 'importer-1'
const DESTINATION_ID = 'destination-1'
const CONTACT_ID = 'contact-1'

const CONSIGNOR_NAME = 'Consignor Ltd'

const PARTIES = [
  ['placeOfOrigin', ORIGIN_ID, 'Origin Farm'],
  ['consignor', CONSIGNOR_ID, CONSIGNOR_NAME],
  ['consignee', CONSIGNEE_ID, 'Consignee Ltd'],
  ['importer', IMPORTER_ID, 'Importer Ltd'],
  ['placeOfDestination', DESTINATION_ID, 'Destination Ltd'],
  ['contactAddress', CONTACT_ID, 'Contact Ltd']
]

describe('reinflatePartyAnswers', () => {
  it('Should write every resolved party inline while retaining addressId', async () => {
    vi.spyOn(resolvePartiesModule, 'resolveParties').mockResolvedValue(
      Object.fromEntries(
        PARTIES.map(([partyId, addressId, name]) => [
          partyId,
          record(addressId, name)
        ])
      )
    )

    const seed = Object.fromEntries(
      PARTIES.map(([partyId, addressId]) => [partyId, { addressId }])
    )
    const answers = await reinflatePartyAnswers(requestFor(), seed)

    for (const [partyId, addressId] of PARTIES) {
      expect(answers[partyId]).toMatchObject({
        addressId,
        name: expect.any(String)
      })
      expect(answers[partyId].address).toBeDefined()
    }
  })

  it('Should leave a party unchanged when resolveParties returns nothing for it', async () => {
    vi.spyOn(resolvePartiesModule, 'resolveParties').mockResolvedValue({
      consignor: record(CONSIGNOR_ID, CONSIGNOR_NAME)
    })

    const answers = await reinflatePartyAnswers(requestFor(), {
      consignor: { addressId: CONSIGNOR_ID, name: 'Stale' },
      consignee: { addressId: 'missing-consignee' }
    })

    expect(answers.consignor).toMatchObject({
      addressId: CONSIGNOR_ID,
      name: CONSIGNOR_NAME
    })
    expect(answers.consignee).toEqual({ addressId: 'missing-consignee' })
  })
})
