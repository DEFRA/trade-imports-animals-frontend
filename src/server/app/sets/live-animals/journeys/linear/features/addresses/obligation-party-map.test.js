import { describe, expect, it } from 'vitest'

import {
  consignee,
  consignor,
  contactAddress,
  importer,
  placeOfDestination,
  placeOfOrigin
} from '../../../../obligations/index.js'
import { CONTACT_PARTY, PARTIES } from './parties.js'
import { partyForFulfilmentId } from './obligation-party-map.js'

describe('obligation-party-map', () => {
  it('maps every party obligation to its picker party', () => {
    for (const party of PARTIES) {
      const fulfilmentId = {
        placeOfOrigin: placeOfOrigin.id,
        consignor: consignor.id,
        consignee: consignee.id,
        importer: importer.id,
        placeOfDestination: placeOfDestination.id
      }[party.id]

      expect(partyForFulfilmentId(fulfilmentId)?.id).toBe(party.id)
    }

    expect(partyForFulfilmentId(contactAddress.id)?.id).toBe(CONTACT_PARTY.id)
  })
})
