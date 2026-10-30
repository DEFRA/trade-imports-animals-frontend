import Boom from '@hapi/boom'

import {
  hubPath,
  pagePath,
  pageRoutePath
} from '../../../../../../../shared/paths.js'
import * as state from '../../../../../../../engine/index.js'
import * as kit from '../../../../../../../shared/kit.js'
import { routeOptions } from '../../../../../../../shared/kit.js'
import { isRecoverableBackendError } from '../../../../../../../services/persistence/records/errors.js'
import { organisationIdOf } from '../../../../../../../../common/helpers/organisation-id.js'
import { partyForFulfilmentId } from '../party-for-fulfilment-id.js'
import {
  ADDRESS_LANDING,
  ADDRESS_LANDING_PARAM,
  clearHandshakeToken,
  setAddedAddressBanner,
  verifyHandshakeToken
} from '../ins-handshake.js'
import { answerFor, chosenPartyFor } from '../party-picker/selection.js'

const partyPageHref = (request, journeyId, party, query = {}) => {
  const path = pagePath(journeyId, party.slug)
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value) {
      params.set(key, value)
    }
  }
  const search = params.toString()
  return kit.withChangeContext(request, search ? `${path}?${search}` : path)
}

const logAndRefuse = (
  request,
  { journeyId, fulfilmentId },
  reason,
  message
) => {
  request.logger.warn(
    { journeyId, fulfilmentId, reason },
    'Address return refused'
  )
  return Boom.badRequest(message)
}

const logLanding = (request, fields) => {
  request.logger.info(fields, 'Returned from the address book')
}

const validLandingOf = (request, returned) => {
  const { addressId, landing } = returned
  if (!landing) {
    return addressId ? ADDRESS_LANDING.SELECT : ADDRESS_LANDING.BACK
  }
  const sentByInsPage = [
    ADDRESS_LANDING.SELECT,
    ADDRESS_LANDING.RETURN,
    ADDRESS_LANDING.CANCEL
  ]
  if (!sentByInsPage.includes(landing)) {
    throw logAndRefuse(request, returned, 'unknown-landing', 'Unknown landing')
  }
  if (landing !== ADDRESS_LANDING.CANCEL && !addressId) {
    throw logAndRefuse(request, returned, 'address-missing', 'Missing address')
  }
  return landing
}

const consumeHandshakeToken = (request, h, returned, handshakeToken) => {
  if (!verifyHandshakeToken(request, returned.fulfilmentId, handshakeToken)) {
    throw logAndRefuse(
      request,
      returned,
      'invalid-handshake',
      'Invalid handshake'
    )
  }
  clearHandshakeToken(request, h, returned.fulfilmentId)
}

const readReturnedAddress = async (
  request,
  h,
  { journeyId, party, addressId }
) => {
  const logged = { journeyId, role: party.id, addressId }
  try {
    const chosen = await chosenPartyFor(organisationIdOf(request), addressId)
    if (chosen) {
      return { chosen }
    }
    request.logger.info(
      { ...logged, reason: 'address-not-found' },
      'Returned address not found, picker shown again'
    )
    return {
      failure: h.redirect(
        partyPageHref(request, journeyId, party, {
          handshakeError: 'not-found'
        })
      )
    }
  } catch (error) {
    if (!isRecoverableBackendError(error)) {
      throw error
    }
    request.logger.warn(
      { ...logged, err: error },
      'Returned address could not be read, picker shown again'
    )
    return {
      failure: h.redirect(
        partyPageHref(request, journeyId, party, {
          handshakeError: 'unavailable'
        })
      )
    }
  }
}

const commitCopyOfAddress = (request, h, { journeyId, party, chosen }) =>
  kit.recoverableSave(
    request,
    async () => {
      await state.commit(request, h, {
        [party.id]: answerFor(party, chosen)
      })
    },
    async () =>
      h.redirect(
        partyPageHref(request, journeyId, party, {
          handshakeError: 'unavailable'
        })
      )
  )

const landOnAddress = async (request, h, returned) => {
  const { journeyId, party, addressId, landing } = returned
  const { chosen, failure: unreadable } = await readReturnedAddress(
    request,
    h,
    returned
  )
  if (unreadable) {
    return unreadable
  }

  if (landing === ADDRESS_LANDING.SELECT) {
    const { failure: unsaved } = await commitCopyOfAddress(request, h, {
      journeyId,
      party,
      chosen
    })
    if (unsaved) {
      return unsaved
    }
  }

  setAddedAddressBanner(h, chosen.name)
  logLanding(request, { journeyId, role: party.id, landing, addressId })

  return h.redirect(
    landing === ADDRESS_LANDING.SELECT
      ? kit.withChangeContext(request, pagePath(journeyId, party.returnSlug))
      : partyPageHref(request, journeyId, party)
  )
}

const get = async (request, h) => {
  const returned = {
    journeyId: request.params.journeyId,
    fulfilmentId: request.query['fulfilment-id'] ?? '',
    addressId: request.query.addressId ?? '',
    landing: request.query[ADDRESS_LANDING_PARAM] ?? ''
  }
  const { journeyId } = returned

  const party = partyForFulfilmentId(returned.fulfilmentId)
  if (!party) {
    throw logAndRefuse(
      request,
      returned,
      'unknown-fulfilment',
      'Unknown fulfilment'
    )
  }

  const landing = validLandingOf(request, returned)
  if (landing === ADDRESS_LANDING.BACK) {
    logLanding(request, { journeyId, role: party.id, landing })
    return h.redirect(partyPageHref(request, journeyId, party))
  }

  consumeHandshakeToken(
    request,
    h,
    returned,
    request.query['handshake-token'] ?? ''
  )

  if (landing === ADDRESS_LANDING.CANCEL) {
    logLanding(request, { journeyId, role: party.id, landing })
    return h.redirect(hubPath(journeyId))
  }

  return landOnAddress(request, h, { ...returned, party, landing })
}

export const routes = [
  {
    method: 'GET',
    path: pageRoutePath('address-return'),
    options: routeOptions,
    handler: get
  }
]
