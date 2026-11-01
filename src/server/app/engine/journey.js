import Boom from '@hapi/boom'
import {
  journeyCookieNames,
  session,
  sessionConfiguredFor
} from './persistence/session.js'
import { currentSetBase, currentSetId } from '../shared/set-context.js'
import { AMEND, DRAFT, records, SUBMITTED } from './persistence/records.js'
import { buildActor } from '../../common/helpers/actor-helpers.js'

/**
 * Registers the active set's journey cookies on the server, scoped to the
 * set's mount. Call it inside the set's context, after `registerSetMount` and
 * `configureSession`.
 *
 * @param {object} server - the Hapi server the set is registering on.
 * @throws {Error} when the session is not configured for the active set.
 */
export const registerJourneyCookie = (server) => {
  const setId = currentSetId()
  if (!sessionConfiguredFor(setId)) {
    throw new Error(
      `Session not configured for set "${setId}" — call configureSession before registerJourneyCookie`
    )
  }

  const cookieOptions = Object.freeze({
    path: currentSetBase(),
    ttl: null,
    encoding: 'base64json',
    isSecure: false,
    isHttpOnly: true,
    isSameSite: 'Lax',
    clearInvalid: true,
    strictHeader: true
  })

  for (const name of journeyCookieNames()) {
    server.state(name, cookieOptions)
  }
}

const JOURNEY_REFUSAL = Object.freeze({
  NOT_FOUND: 'not-found',
  NOT_EDITABLE: 'not-editable'
})

const logJourneyActionRefused = (
  request,
  { action, journeyId, reason, ...fields }
) => {
  request.logger.info({ journeyId, reason, ...fields }, `${action} refused`)
}

const JOURNEY_MEMO = Symbol('currentJourney')

const memoRead = (request) => request?.app?.[JOURNEY_MEMO]

const memoWrite = (request, journey) => {
  if (request?.app) {
    request.app[JOURNEY_MEMO] = journey
  }
}

export const startJourney = async (request, h) => {
  const actor = buildActor(request.auth?.credentials)
  const journey = await records.create(actor)
  await session.addKnownJourney(request, h, journey.journeyId)
  memoWrite(request, journey)
  return journey
}

const loadAndRememberJourney = async (request, h, journeyId) => {
  const loaded = await records.load({ journeyId })
  if (loaded && !(await isKnownJourney(request, journeyId))) {
    request.logger.info(
      { journeyId },
      'Notification added to the known journeys of this session'
    )
    await session.addKnownJourney(request, h, journeyId)
  }
  return loaded
}

export const currentJourney = async (request, h) => {
  const cached = memoRead(request)
  if (cached) {
    return structuredClone(cached)
  }
  const journeyId = request.params?.journeyId
  if (!journeyId) {
    throw Boom.notFound()
  }
  const loaded = await loadAndRememberJourney(request, h, journeyId)
  if (!loaded) {
    throw Boom.notFound()
  }
  memoWrite(request, loaded)
  return structuredClone(loaded)
}

export const replaceJourneyFulfilment = async (
  request,
  journeyId,
  fulfilment
) => {
  const cached = memoRead(request)
  const memoKnown = cached?.journeyId === journeyId ? cached : undefined
  const payloadToken = request?.payload?.concurrencyToken
  const known =
    memoKnown ??
    (payloadToken != null
      ? { journeyId, concurrencyToken: Number(payloadToken) }
      : undefined)
  const actor = buildActor(request.auth?.credentials)
  const saved = await records.replaceFulfilment(journeyId, fulfilment, {
    known,
    actor
  })
  const next = { ...saved, fulfilment: structuredClone(fulfilment) }
  memoWrite(request, next)
  return next
}

export const listKnownJourneys = async (
  request,
  { page, sort, referenceNumber } = {}
) => {
  const journeyIds = await session.knownJourneyIds(request)
  return records.list({ journeyIds, page, sort, referenceNumber })
}

export const isKnownJourney = async (request, journeyId) =>
  (await session.knownJourneyIds(request)).includes(journeyId)

const editableFromStatus = async (journey, journeyId, actor) => {
  if (journey.status === SUBMITTED) {
    return records.amend(journeyId, actor)
  }
  if (journey.status === DRAFT || journey.status === AMEND) {
    return journey
  }
  return undefined
}

export const amendJourney = async (request, h, journeyId) => {
  const journey = await loadAndRememberJourney(request, h, journeyId)
  if (!journey) {
    logJourneyActionRefused(request, {
      action: 'Amend',
      journeyId,
      reason: JOURNEY_REFUSAL.NOT_FOUND
    })
    return undefined
  }
  const actor = buildActor(request.auth.credentials)
  const editable = await editableFromStatus(journey, journeyId, actor)
  if (!editable) {
    logJourneyActionRefused(request, {
      action: 'Amend',
      journeyId,
      reason: JOURNEY_REFUSAL.NOT_EDITABLE,
      status: journey.status
    })
    return undefined
  }
  memoWrite(request, editable)
  return editable
}

export const cancelAmendJourney = async (request, _h, journeyId) => {
  if (!(await isKnownJourney(request, journeyId))) {
    return undefined
  }
  const actor = buildActor(request.auth.credentials)
  const restored = await records.cancelAmend(journeyId, actor)
  memoWrite(request, restored)
  return restored
}

export const copyJourney = async (request, h, journeyId, concurrencyToken) => {
  if (!(await records.has(journeyId))) {
    logJourneyActionRefused(request, {
      action: 'Copy',
      journeyId,
      reason: JOURNEY_REFUSAL.NOT_FOUND
    })
    return undefined
  }
  const actor = buildActor(request.auth.credentials)
  const copied = await records.copy(journeyId, concurrencyToken, actor)
  await session.addKnownJourney(request, h, copied.journeyId)
  memoWrite(request, copied)
  return copied
}

export const softDeleteJourney = async (request, _h, journeyId) => {
  if (!(await isKnownJourney(request, journeyId))) {
    return undefined
  }
  const actor = buildActor(request.auth.credentials)
  return records.softDelete(journeyId, actor)
}
