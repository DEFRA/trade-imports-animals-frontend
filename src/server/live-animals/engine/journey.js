import Boom from '@hapi/boom'
import { BASE } from '../config.js'
import {
  session,
  KNOWN_JOURNEYS_COOKIE,
  OPENING_RUN_COOKIE,
  FLOW_ONLY_ANSWERS_COOKIE
} from './persistence/session.js'
import { records, SUBMITTED } from './persistence/records.js'

export { KNOWN_JOURNEYS_COOKIE } from './persistence/session.js'

const cookieOptions = Object.freeze({
  path: BASE,
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
    userId: await session.userId(request)
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
  if (!(await isKnownJourney(request, journeyId))) throw Boom.notFound()
  const loaded = await records.load({ journeyId })
  if (!loaded) throw Boom.notFound()
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
  memoWrite(
    request,
    known ? { ...known, fulfilment: structuredClone(fulfilment) } : saved
  )
  return known ? { ...known, fulfilment: structuredClone(fulfilment) } : saved
}

export const listKnownJourneys = async (request) =>
  records.list({ journeyIds: await session.knownJourneyIds(request) })

export const isKnownJourney = async (request, journeyId) =>
  (await session.knownJourneyIds(request)).includes(journeyId)

export const amendJourney = async (request, h, journeyId) => {
  if (!(await isKnownJourney(request, journeyId))) return undefined
  const journey = await records.load({ journeyId })
  if (!journey) return undefined
  const editable =
    journey.status === SUBMITTED ? await records.amend(journeyId) : journey
  memoWrite(request, editable)
  return editable
}
