import crypto from 'node:crypto'

import { config } from '../../../../../../../../config/config.js'
import {
  addedAddressBannerCookie,
  addressHandshakeTokensCookie
} from '../../../../../../engine/persistence/session.js'
import { copyFor } from '../../../../../../shared/copy.js'
import { copy as sharedEn } from '../../../../../../shared/copy.en.js'
import { copy as sharedCy } from '../../../../../../shared/copy.cy.js'
import { fulfilmentIdForParty } from './party-for-fulfilment-id.js'

export const JOURNEY_TYPE = 'gbn-ag'

export const ADDRESS_LANDING_PARAM = 'landing'

export const ADDRESS_LANDING = Object.freeze({
  SELECT: 'select',
  RETURN: 'return',
  CANCEL: 'cancel'
})

const HANDSHAKE_TOKEN_BYTES = 16

export const handshakeErrorMessage = (handshakeErrors, code) => {
  if (code === 'not-found') {
    return handshakeErrors.notFound
  }
  if (code === 'unavailable') {
    return handshakeErrors.unavailable
  }
  return undefined
}

const handshakeTokenMap = (request) =>
  request.state[addressHandshakeTokensCookie()] ?? {}

const storeHandshakeToken = (request, h, fulfilmentId, token) => {
  h.state(addressHandshakeTokensCookie(), {
    ...handshakeTokenMap(request),
    [fulfilmentId]: token
  })
}

export const verifyHandshakeToken = (request, fulfilmentId, token) => {
  if (!token) {
    return false
  }
  return handshakeTokenMap(request)[fulfilmentId] === token
}

export const clearHandshakeToken = (request, h, fulfilmentId) => {
  const map = { ...handshakeTokenMap(request) }
  delete map[fulfilmentId]
  if (Object.keys(map).length === 0) {
    h.unstate(addressHandshakeTokensCookie())
    return
  }
  h.state(addressHandshakeTokensCookie(), map)
}

export const setAddedAddressBanner = (h, addressName) => {
  h.state(addedAddressBannerCookie(), { name: addressName })
}

export const takeAddedAddressBanner = (request, h) => {
  const added = request.state[addedAddressBannerCookie()]
  if (!added) {
    return null
  }
  h.unstate(addedAddressBannerCookie())
  const addedBannerCopy = copyFor({ en: sharedEn, cy: sharedCy })
    .addressHandshake.addedBanner
  return {
    titleText: addedBannerCopy.title,
    text: addedBannerCopy.text(added.name)
  }
}

export const issueInsAddAddressUrl = (request, h, notificationId, party) => {
  const fulfilmentId = fulfilmentIdForParty(party)
  if (!fulfilmentId) {
    return undefined
  }

  const token = crypto.randomBytes(HANDSHAKE_TOKEN_BYTES).toString('hex')
  storeHandshakeToken(request, h, fulfilmentId, token)

  const base = config.get('tradeImportsInsFrontend.baseUrl').replace(/\/$/, '')
  const params = new URLSearchParams({
    'journey-type': JOURNEY_TYPE,
    'notification-id': notificationId,
    'fulfilment-id': fulfilmentId,
    'handshake-token': token
  })

  return `${base}/address-book/add?${params.toString()}`
}
