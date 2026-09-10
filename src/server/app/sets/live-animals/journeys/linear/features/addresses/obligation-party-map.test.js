import { describe, expect, it } from 'vitest'

import { consignor } from '../../../../obligations/index.js'
import { CONTACT_PARTY, PARTIES } from './parties.js'
import { partyForFulfilmentId } from './obligation-party-map.js'

describe('obligation-party-map', () => {
  it('maps every party obligation to its picker party', () => {
    for (const party of PARTIES) {
      const fulfilmentId = {
        placeOfOrigin: '89c0d1e2-f3a4-4b5f-8c0b-8d9e0f1a2b3c',
        consignor: consignor.id,
        consignee: 'abe2f3a4-b5c6-4d71-8e2d-af0a1b2c3d4e',
        importer: 'bcf3a4b5-c6d7-4e82-8f3e-ba1b2c3d4e5f',
        placeOfDestination: 'cd04b5c6-d7e8-4f93-8a4f-cb2c3d4e5f60'
      }[party.id]

      expect(partyForFulfilmentId(fulfilmentId)?.id).toBe(party.id)
    }

    expect(
      partyForFulfilmentId('f037e8f9-a0b1-4c26-8d72-fe5f60718293')?.id
    ).toBe(CONTACT_PARTY.id)
  })
})
