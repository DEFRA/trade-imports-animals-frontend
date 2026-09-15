import { afterEach, describe, expect, it } from 'vitest'

import { config } from '../../../../../../../../config/config.js'
import { SESSION_COOKIES } from '../../../../../../engine/persistence/session.js'
import {
  recordingH,
  journeyRequest
} from '../../../../../../engine/test-support.js'
import { consignor } from '../../../../obligations/index.js'
import { CONTACT_PARTY, PARTIES } from './parties.js'
import { buildInsAddAddressUrl, obligationIdForParty } from './ins-handshake.js'

const INS_FRONTEND_BASE_URL_KEY = 'tradeImportsInsFrontend.baseUrl'
const notificationId = 'notification-123'

describe('ins-handshake', () => {
  const originalInsUrl = config.get(INS_FRONTEND_BASE_URL_KEY)

  afterEach(() => {
    config.set(INS_FRONTEND_BASE_URL_KEY, originalInsUrl)
  })

  it('maps each party obligation to its fulfilment id', () => {
    for (const party of PARTIES) {
      expect(obligationIdForParty(party)).toBeTruthy()
    }
    expect(obligationIdForParty(CONTACT_PARTY)).toBeTruthy()
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
    expect(h.cookies[SESSION_COOKIES.addressHandshakeTokens]).toBeDefined()
    expect(
      h.cookies[SESSION_COOKIES.addressHandshakeTokens][consignor.id]
    ).toBeTruthy()
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
