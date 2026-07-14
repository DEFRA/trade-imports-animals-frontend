import { BASE } from '../config.js'
import {
  session,
  JOURNEY_COOKIE,
  KNOWN_JOURNEYS_COOKIE,
  OPENING_RUN_COOKIE
} from './persistence/session.js'
import { records, SUBMITTED } from './persistence/records.js'

export { JOURNEY_COOKIE, KNOWN_JOURNEYS_COOKIE } from './persistence/session.js'

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
  server.state(JOURNEY_COOKIE, cookieOptions)
  server.state(KNOWN_JOURNEYS_COOKIE, {
    ...cookieOptions,
    encoding: 'base64json'
  })
  server.state(OPENING_RUN_COOKIE, {
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

const makeActive = async (request, h, journey) => {
  await session.setActiveJourney(h, journey.journeyId)
  await session.addKnownJourney(request, h, journey.journeyId)
  memoWrite(request, journey)
  return journey
}

export const startJourney = async (request, h) => {
  const journey = await records.create({
    userId: await session.userId(request)
  })
  return makeActive(request, h, journey)
}

export const currentJourney = async (request, h) => {
  const cached = memoRead(request)
  if (cached) {
    return structuredClone(cached)
  }
  const journeyId = await session.activeJourneyId(request)
  const loaded = journeyId ? await records.load({ journeyId }) : undefined
  if (loaded) {
    memoWrite(request, loaded)
    return structuredClone(loaded)
  }
  return startJourney(request, h)
}

export const saveJourneyAnswers = async (request, journeyId, answers) => {
  const cached = memoRead(request)
  const known = cached?.journeyId === journeyId ? cached : undefined
  const saved = await records.saveAnswers(journeyId, answers, { known })
  memoWrite(
    request,
    known ? { ...known, answers: structuredClone(answers) } : saved
  )
  return saved
}

export const listKnownJourneys = async (request) =>
  records.list({ journeyIds: await session.knownJourneyIds(request) })

export const isKnownJourney = async (request, journeyId) =>
  (await session.knownJourneyIds(request)).includes(journeyId)

export const selectJourney = async (request, h, journeyId) => {
  if (!(await isKnownJourney(request, journeyId))) return undefined
  const journey = await records.load({ journeyId })
  if (!journey) return undefined
  return makeActive(request, h, journey)
}

export const amendJourney = async (request, h, journeyId) => {
  if (!(await isKnownJourney(request, journeyId))) return undefined
  const journey = await records.load({ journeyId })
  if (!journey) return undefined
  const editable =
    journey.status === SUBMITTED ? await records.amend(journeyId) : journey
  return makeActive(request, h, editable)
}
