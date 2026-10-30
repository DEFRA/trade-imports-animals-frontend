import { afterEach, describe, expect, it } from 'vitest'

import { config } from '../../../../../../../../config/config.js'
import { addressHandshakeTokensCookie } from '../../../../../../engine/persistence/session.js'
import {
  recordingH,
  journeyRequest
} from '../../../../../../engine/test-support.js'
import { consignor } from '../../../../obligations/index.js'
import { PARTIES } from './parties.js'
import {
  issueInsAddAddressUrl,
  setAddedAddressBanner,
  takeAddedAddressBanner
} from './ins-handshake.js'
import { addedAddressBannerState } from './test-support.js'

const INS_FRONTEND_BASE_URL_KEY = 'tradeImportsInsFrontend.baseUrl'
const notificationId = 'notification-123'

describe('ins-handshake', () => {
  const originalInsUrl = config.get(INS_FRONTEND_BASE_URL_KEY)

  afterEach(() => {
    config.set(INS_FRONTEND_BASE_URL_KEY, originalInsUrl)
  })

  it('issues a handshake token, stores it in the tokens cookie and returns the INS add URL carrying it', () => {
    config.set(INS_FRONTEND_BASE_URL_KEY, 'http://localhost:3002/')
    const party = PARTIES.find((each) => each.id === 'consignor')
    const h = recordingH()
    const request = journeyRequest(notificationId)

    const url = issueInsAddAddressUrl(request, h, notificationId, party)

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

  it('stores the added address name in the banner cookie', () => {
    const h = recordingH()

    setAddedAddressBanner(h, 'New Farm')

    expect(h.cookies).toEqual(addedAddressBannerState('New Farm'))
  })

  it('takes the added address banner from the request and unstates its cookie', () => {
    const h = recordingH()
    const state = addedAddressBannerState('ABC Farms Ltd')
    Object.assign(h.cookies, state)
    const request = journeyRequest(notificationId, { state })

    expect(takeAddedAddressBanner(request, h)).toEqual({
      titleText: 'Success',
      text: 'ABC Farms Ltd address added to your address book'
    })
    expect(h.cookies).toEqual({})
  })

  it('names the address as it is stored, even when it holds a replacement pattern', () => {
    const request = journeyRequest(notificationId, {
      state: addedAddressBannerState('Fish $& Chips')
    })

    expect(takeAddedAddressBanner(request, recordingH()).text).toBe(
      'Fish $& Chips address added to your address book'
    )
  })

  it('takes no banner when the request holds no banner cookie', () => {
    const request = journeyRequest(notificationId)

    expect(takeAddedAddressBanner(request, recordingH())).toBeNull()
  })

  it('returns undefined when the party has no fulfilment mapping', () => {
    const h = recordingH()
    const request = journeyRequest(notificationId)

    expect(
      issueInsAddAddressUrl(request, h, notificationId, {
        id: 'unknown-party'
      })
    ).toBeUndefined()
  })
})
