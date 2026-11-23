import { describe, expect, it } from 'vitest'

import {
  consignee,
  consignor,
  importer,
  placeOfDestination,
  placeOfOrigin
} from '../../../../obligations/index.js'
import { partyOf } from './parties.js'
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
    [placeOfDestination.id, 'placeOfDestination']
  ])(
    'maps fulfilment id %s to the %s party',
    (fulfilmentId, expectedPartyId) => {
      const party = partyForFulfilmentId(fulfilmentId)
      expect(party).toBeDefined()
      expect(party.id).toBe(expectedPartyId)
    }
  )

  it.each([
    ['placeOfOrigin', placeOfOrigin.id],
    ['consignor', consignor.id],
    ['consignee', consignee.id],
    ['importer', importer.id],
    ['placeOfDestination', placeOfDestination.id]
  ])('maps %s to fulfilment id %s', (partyId, expectedFulfilmentId) => {
    expect(fulfilmentIdForParty(partyOf(partyId))).toBe(expectedFulfilmentId)
  })
})
