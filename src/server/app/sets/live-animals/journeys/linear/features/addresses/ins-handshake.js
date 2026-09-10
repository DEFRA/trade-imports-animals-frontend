import { config } from '../../../../../../../../config/config.js'
import { obligationPartyMap } from './obligation-party-map.js'

export const JOURNEY_TYPE = 'gbn-ag'

export const obligationIdForParty = (party) => {
  for (const [obligationId, mappedParty] of obligationPartyMap) {
    if (mappedParty.id === party.id) {
      return obligationId
    }
  }
  return undefined
}

export const buildInsAddAddressUrl = (notificationId, party) => {
  const fulfilmentId = obligationIdForParty(party)
  if (!fulfilmentId) {
    return undefined
  }

  const base = config.get('tradeImportsInsFrontend.baseUrl').replace(/\/$/, '')
  const params = new URLSearchParams({
    'journey-type': JOURNEY_TYPE,
    'notification-id': notificationId,
    'fulfilment-id': fulfilmentId
  })

  return `${base}/address-book/add?${params.toString()}`
}
