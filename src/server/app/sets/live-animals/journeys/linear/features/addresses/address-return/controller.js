import Boom from '@hapi/boom'

import { pagePath, pageRoutePath } from '../../../../../../../shared/paths.js'
import * as state from '../../../../../../../engine/index.js'
import { HTTP_STATUS_INTERNAL_SERVER_ERROR } from '../../../../../../../lib/http-status.js'
import * as kit from '../../../../../../../shared/kit.js'
import { routeOptions } from '../../../../../../../shared/kit.js'
import { isRecoverableBackendError } from '../../../../../../../services/persistence/records/errors.js'
import { organisationIdOf } from '../resolve-parties.js'
import { partyForFulfilmentId } from '../obligation-party-map.js'
import { answerFor, chosenPartyFor } from '../party-picker/selection.js'

const pickerPath = (journeyId, party, query = {}) => {
  const path = pagePath(journeyId, party.slug)
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value) {
      params.set(key, value)
    }
  }
  const search = params.toString()
  return search ? `${path}?${search}` : path
}

const redirectToPicker = (request, journeyId, party, query = {}) =>
  kit.withChangeContext(request, pickerPath(journeyId, party, query))

const get = async (request, h) => {
  const { journeyId } = request.params
  const fulfilmentId = request.query['fulfilment-id'] ?? ''
  const addressId = request.query.addressId ?? ''

  const party = partyForFulfilmentId(fulfilmentId)
  if (!party) {
    throw Boom.badRequest('Unknown fulfilment')
  }

  if (!addressId) {
    return h.redirect(redirectToPicker(request, journeyId, party))
  }

  const orgId = organisationIdOf(request)
  let chosen

  try {
    chosen = await chosenPartyFor(orgId, addressId)
  } catch (error) {
    if (isRecoverableBackendError(error)) {
      return h.redirect(
        redirectToPicker(request, journeyId, party, {
          handshakeError: 'unavailable'
        })
      )
    }
    throw error
  }

  if (!chosen) {
    return h.redirect(
      redirectToPicker(request, journeyId, party, {
        handshakeError: 'not-found'
      })
    )
  }

  const { failure } = await kit.recoverableSave(
    async () => {
      await state.commit(request, h, {
        [party.id]: answerFor(party, chosen)
      })
    },
    async () =>
      h
        .redirect(
          redirectToPicker(request, journeyId, party, {
            handshakeError: 'unavailable'
          })
        )
        .code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
  )

  if (failure) {
    return failure
  }

  return h.redirect(
    redirectToPicker(request, journeyId, party, {
      selected: addressId
    })
  )
}

export const routes = [
  {
    method: 'GET',
    path: pageRoutePath('address-return'),
    options: routeOptions,
    handler: get
  }
]
