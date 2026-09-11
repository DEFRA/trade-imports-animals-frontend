import { afterEach, describe, expect, it } from 'vitest'

import { config } from '../../../../../../../../config/config.js'
import { consignor } from '../../../../obligations/index.js'
import { CONTACT_PARTY, PARTIES } from './parties.js'
import {
  JOURNEY_TYPE,
  buildInsAddAddressUrl,
  obligationIdForParty
} from './ins-handshake.js'

const INS_FRONTEND_BASE_URL_KEY = 'tradeImportsInsFrontend.baseUrl'

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

    const url = buildInsAddAddressUrl('notification-123', party)

    expect(url).toBe(
      `http://localhost:3002/address-book/add?journey-type=${JOURNEY_TYPE}&notification-id=notification-123&fulfilment-id=${consignor.id}`
    )
  })

  it('returns undefined when the party has no fulfilment mapping', () => {
    expect(
      buildInsAddAddressUrl('notification-123', { id: 'unknown-party' })
    ).toBeUndefined()
  })
})
