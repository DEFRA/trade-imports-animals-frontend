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

export const startJourney = async (request, h) => {
  const journey = await records.create({
    userId: await session.userId(request)
  })
  await session.setActiveJourney(h, journey.journeyId)
  return journey
}

export const currentJourney = async (request, h) => {
  const journeyId = await session.activeJourneyId(request)
  if (journeyId && (await records.has(journeyId))) {
    return records.load({ journeyId })
  }
  return startJourney(request, h)
}

export const resumeByUser = async (request, h) => {
  const journey = await records.load({ userId: await session.userId(request) })
  if (!journey) return startJourney(request, h)
  await session.setActiveJourney(h, journey.journeyId)
  return journey
}
