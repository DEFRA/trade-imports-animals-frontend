import Boom from '@hapi/boom'
import { BASE } from '../shared/paths.js'
import { session, SESSION_COOKIES } from './persistence/session.js'
import { AMEND, DRAFT, records, SUBMITTED } from './persistence/records.js'
import { buildActor } from '../../common/helpers/actor-helpers.js'

export { SESSION_COOKIES } from './persistence/session.js'

const cookieOptions = Object.freeze({
  path: BASE || '/',
  ttl: null,
  encoding: 'none',
  isSecure: false,
  isHttpOnly: true,
  isSameSite: 'Lax',
  clearInvalid: true,
  strictHeader: true
})

export const registerJourneyCookie = (server) => {
  server.state(SESSION_COOKIES.knownJourneys, {
    ...cookieOptions,
    encoding: 'base64json'
  })
  server.state(SESSION_COOKIES.openingRun, {
    ...cookieOptions,
    encoding: 'base64json'
  })
  server.state(SESSION_COOKIES.flowOnlyAnswers, {
    ...cookieOptions,
    encoding: 'base64json'
  })
}

const JOURNEY_MEMO = Symbol('currentJourney')

const memoRead = (request) => request?.app?.[JOURNEY_MEMO]

const memoWrite = (request, journey) => {
  if (request?.app) {
    request.app[JOURNEY_MEMO] = journey
  }
}

export const startJourney = async (request, h) => {
  const journey = await records.create()
  await session.addKnownJourney(request, h, journey.journeyId)
  memoWrite(request, journey)
  return journey
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
  const loaded = await records.load({ journeyId })
  if (!loaded) {
    throw Boom.notFound()
  }
  await session.addKnownJourney(request, h, journeyId)
  memoWrite(request, loaded)
  return structuredClone(loaded)
}

export const replaceJourneyFulfilment = async (
  request,
  journeyId,
  fulfilment
) => {
  const cached = memoRead(request)
  const known = cached?.journeyId === journeyId ? cached : undefined
  const saved = await records.replaceFulfilment(journeyId, fulfilment, {
    known
  })
  const next = known
    ? { ...known, fulfilment: structuredClone(fulfilment) }
    : saved
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

const COPYABLE_STATUSES = Object.freeze([DRAFT, SUBMITTED, AMEND])

const editableFromStatus = async (journey, journeyId, actor) => {
  if (journey.status === SUBMITTED) {
    return records.amend(journeyId, actor)
  }
  if (journey.status === DRAFT || journey.status === AMEND) {
    return journey
  }
  return undefined
}

export const amendJourney = async (request, _h, journeyId) => {
  const journey = await records.load({ journeyId })
  if (!journey) {
    return undefined
  }
  const actor = buildActor(request.auth.credentials)
  const editable = await editableFromStatus(journey, journeyId, actor)
  if (!editable) {
    return undefined
  }
  memoWrite(request, editable)
  return editable
}

export const cancelAmendJourney = async (request, _h, journeyId) => {
  const restored = await records.cancelAmend(journeyId)
  memoWrite(request, restored)
  return restored
}

export const copyJourney = async (request, h, journeyId, idempotencyKey) => {
  const source = await records.load({ journeyId })
  if (!source || !COPYABLE_STATUSES.includes(source.status)) {
    return undefined
  }
  const copied = await records.copy(journeyId, idempotencyKey)
  await session.addKnownJourney(request, h, copied.journeyId)
  memoWrite(request, copied)
  return copied
}

export const softDeleteJourney = async (request, _h, journeyId) => {
  const actor = buildActor(request.auth.credentials)
  return records.softDelete(journeyId, actor)
}
