import { afterEach, describe, expect, it } from 'vitest'

import { config } from '../../../../../../../../config/config.js'
import { addressHandshakeTokensCookie } from '../../../../../../engine/persistence/session.js'
import {
  recordingH,
  journeyRequest
} from '../../../../../../engine/test-support.js'
import {
  consignee,
  consignor,
  contactAddress,
  importer,
  placeOfDestination,
  placeOfOrigin
} from '../../../../obligations/index.js'
import { CONTACT_PARTY, PARTIES } from './parties.js'
import { fulfilmentIdForParty } from './party-for-fulfilment-id.js'
import { buildInsAddAddressUrl } from './ins-handshake.js'

const INS_FRONTEND_BASE_URL_KEY = 'tradeImportsInsFrontend.baseUrl'
const notificationId = 'notification-123'

const fulfilmentIdByPartyId = {
  placeOfOrigin: placeOfOrigin.id,
  consignor: consignor.id,
  consignee: consignee.id,
  importer: importer.id,
  placeOfDestination: placeOfDestination.id,
  contactAddress: contactAddress.id
}

describe('ins-handshake', () => {
  const originalInsUrl = config.get(INS_FRONTEND_BASE_URL_KEY)

  afterEach(() => {
    config.set(INS_FRONTEND_BASE_URL_KEY, originalInsUrl)
  })

  it.each([
    ...PARTIES.map((party) => [party.id, fulfilmentIdByPartyId[party.id]]),
    [CONTACT_PARTY.id, contactAddress.id]
  ])('maps %s to fulfilment id %s', (partyId, expectedFulfilmentId) => {
    const party =
      partyId === CONTACT_PARTY.id
        ? CONTACT_PARTY
        : PARTIES.find((each) => each.id === partyId)

    expect(fulfilmentIdForParty(party)).toBe(expectedFulfilmentId)
  })

  it('builds the INS add URL with handshake query params', () => {
    config.set(INS_FRONTEND_BASE_URL_KEY, 'http://localhost:3002/')
    const party = PARTIES.find((each) => each.id === 'consignor')
    const h = recordingH()
    const request = journeyRequest(notificationId)

    const url = buildInsAddAddressUrl(request, h, notificationId, party)

    expect(url).toMatch(
      new RegExp(
        `^http://localhost:3002/address-book/add\\?journey-type=gbn-ag&notification-id=${notificationId}&fulfilment-id=`
      )
    )
    expect(url).toContain(`fulfilment-id=${consignor.id}`)
    expect(url).toContain('handshake-token=')
    expect(h.cookies[addressHandshakeTokensCookie()]).toBeDefined()
    expect(h.cookies[addressHandshakeTokensCookie()][consignor.id]).toMatch(
      /^[0-9a-f]{32}$/
    )
  })

  it('returns undefined when the party has no fulfilment mapping', () => {
    const h = recordingH()
    const request = journeyRequest(notificationId)

    expect(
      buildInsAddAddressUrl(request, h, notificationId, {
        id: 'unknown-party'
      })
    ).toBeUndefined()
  })
})
