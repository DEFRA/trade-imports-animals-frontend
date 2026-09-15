import crypto from 'node:crypto'

import { config } from '../../../../../../../../config/config.js'
import { SESSION_COOKIES } from '../../../../../../engine/persistence/session.js'
import { fulfilmentIdForParty } from './party-for-fulfilment-id.js'

export const JOURNEY_TYPE = 'gbn-ag'

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
  request.state[SESSION_COOKIES.addressHandshakeTokens] ?? {}

const storeHandshakeToken = (request, h, fulfilmentId, token) => {
  h.state(SESSION_COOKIES.addressHandshakeTokens, {
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
    h.unstate(SESSION_COOKIES.addressHandshakeTokens)
    return
  }
  h.state(SESSION_COOKIES.addressHandshakeTokens, map)
}

export const buildInsAddAddressUrl = (request, h, notificationId, party) => {
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
