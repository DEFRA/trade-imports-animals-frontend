import { BASE } from '../config.js'
import { session, JOURNEY_COOKIE } from './persistence/session.js'
import { records } from './persistence/records.js'

export { JOURNEY_COOKIE } from './persistence/session.js'

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

export const registerJourneyCookie = (server) =>
  server.state(JOURNEY_COOKIE, cookieOptions)

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
  await session.setActiveJourney(h, journey.journeyId)
  memoWrite(request, journey)
  return journey
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

export const resumeByUser = async (request, h) => {
  const journey = await records.load({ userId: await session.userId(request) })
  if (!journey) return startJourney(request, h)
  await session.setActiveJourney(h, journey.journeyId)
  return journey
}
