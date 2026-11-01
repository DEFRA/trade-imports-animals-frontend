import { describe, expect, it } from 'vitest'

import {
  consignee,
  consignor,
  contactAddress,
  importer,
  placeOfDestination,
  placeOfOrigin
} from '../../../../obligations/index.js'
import { CONTACT_PARTY, partyOf } from './parties.js'
import {
  fulfilmentIdForParty,
  partyForFulfilmentId
} from './party-for-fulfilment-id.js'

describe('party-for-fulfilment-id', () => {
  it.each([
    [placeOfOrigin.id, 'placeOfOrigin'],
    [consignor.id, 'consignor'],
    [consignee.id, 'consignee'],
    [importer.id, 'importer'],
    [placeOfDestination.id, 'placeOfDestination'],
    [contactAddress.id, 'contactAddress']
  ])(
    'maps fulfilment id %s to the %s party',
    (fulfilmentId, expectedPartyId) => {
      const party = partyForFulfilmentId(fulfilmentId)
      expect(party).toBeDefined()
      expect(party.id).toBe(expectedPartyId)
    }
  )

  it('maps the contact fulfilment id to CONTACT_PARTY', () => {
    const party = partyForFulfilmentId(contactAddress.id)
    expect(party).toBeDefined()
    expect(party.id).toBe(CONTACT_PARTY.id)
  })

  it.each([
    ['placeOfOrigin', placeOfOrigin.id],
    ['consignor', consignor.id],
    ['consignee', consignee.id],
    ['importer', importer.id],
    ['placeOfDestination', placeOfDestination.id],
    ['contactAddress', contactAddress.id]
  ])('maps %s to fulfilment id %s', (partyId, expectedFulfilmentId) => {
    expect(fulfilmentIdForParty(partyOf(partyId))).toBe(expectedFulfilmentId)
  })
})
