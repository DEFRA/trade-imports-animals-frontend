import Boom from '@hapi/boom'
import { BASE } from '../config.js'
import {
  session,
  KNOWN_JOURNEYS_COOKIE,
  OPENING_RUN_COOKIE,
  FLOW_ONLY_ANSWERS_COOKIE
} from './persistence/session.js'
import { AMEND, DRAFT, records, SUBMITTED } from './persistence/records.js'

export { KNOWN_JOURNEYS_COOKIE } from './persistence/session.js'

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
  server.state(KNOWN_JOURNEYS_COOKIE, {
    ...cookieOptions,
    encoding: 'base64json'
  })
  server.state(OPENING_RUN_COOKIE, {
    ...cookieOptions,
    encoding: 'base64json'
  })
  server.state(FLOW_ONLY_ANSWERS_COOKIE, {
    ...cookieOptions,
    encoding: 'base64json'
  })
}

const JOURNEY_MEMO = Symbol('liveAnimalsCurrentJourney')

const memoRead = (request) => request?.app?.[JOURNEY_MEMO]

const memoWrite = (request, journey) => {
  if (request?.app) {
    request.app[JOURNEY_MEMO] = journey
  }
}

export const startJourney = async (request, h) => {
  const journey = await records.create({
    owner: await session.owner(request)
  })
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
  if (!journeyId) throw Boom.notFound()
  const owner = await session.owner(request)
  // The record store is the ownership authority: it returns the journey only for
  // its owner. A fresh session (e.g. after a re-sign-in) legitimately owns the
  // journey but has an empty known-list, so seed it here rather than 404 a journey
  // the owner can see on their dashboard.
  const loaded = await records.load({ journeyId, owner })
  if (!loaded) throw Boom.notFound()
  if (!(await isKnownJourney(request, journeyId))) {
    await session.addKnownJourney(request, h, journeyId)
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
  const known = cached?.journeyId === journeyId ? cached : undefined
  const owner = await session.owner(request)
  const saved = await records.replaceFulfilment(journeyId, fulfilment, {
    known,
    owner
  })
  const next = known
    ? { ...known, fulfilment: structuredClone(fulfilment) }
    : saved
  memoWrite(request, next)
  return next
}

export const listKnownJourneys = async (request, { page, sort } = {}) => {
  const journeyIds = await session.knownJourneyIds(request)
  const owner = await session.owner(request)
  return records.list({ journeyIds, owner, page, sort })
}

export const isKnownJourney = async (request, journeyId) =>
  (await session.knownJourneyIds(request)).includes(journeyId)

const editableFromStatus = (journey, journeyId, owner) => {
  if (journey.status === SUBMITTED) return records.amend(journeyId, owner)
  if (journey.status === DRAFT || journey.status === AMEND) return journey
  return undefined
}

export const amendJourney = async (request, h, journeyId) => {
  if (!(await isKnownJourney(request, journeyId))) return undefined
  const owner = await session.owner(request)
  const journey = await records.load({ journeyId, owner })
  if (!journey) return undefined
  const editable = await editableFromStatus(journey, journeyId, owner)
  if (!editable) return undefined
  memoWrite(request, editable)
  return editable
}

export const cancelAmendJourney = async (request, _h, journeyId) => {
  if (!(await isKnownJourney(request, journeyId))) return undefined
  const restored = await records.cancelAmend(
    journeyId,
    await session.owner(request)
  )
  memoWrite(request, restored)
  return restored
}

export const copyJourney = async (request, h, journeyId, idempotencyKey) => {
  if (!(await isKnownJourney(request, journeyId))) return undefined
  const owner = await session.owner(request)
  const copied = await records.copy(journeyId, owner, idempotencyKey)
  await session.addKnownJourney(request, h, copied.journeyId)
  memoWrite(request, copied)
  return copied
}

export const softDeleteJourney = async (request, _h, journeyId) => {
  if (!(await isKnownJourney(request, journeyId))) return undefined
  return records.softDelete(journeyId, await session.owner(request))
}
