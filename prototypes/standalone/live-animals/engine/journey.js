import { BASE } from '../config.js'
import { session, JOURNEY_COOKIE } from './persistence/session.js'
import { records } from './persistence/records.js'

/**
 * The journey-isolation seam — the one place a request is tied to a Journey
 * document.
 */
export { JOURNEY_COOKIE } from './persistence/session.js'

// Path-scoped to BASE so this spike can never read another spike's cookie, and
// parallel browser contexts each carry their own journey.
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

export const startJourney = (request, h) => {
  const journey = records.create({ userId: session.userId(request) })
  session.setActiveJourney(h, journey.journeyId)
  return journey
}

export const currentJourney = (request, h) => {
  const journeyId = session.activeJourneyId(request)
  if (journeyId && records.has(journeyId)) return records.load({ journeyId })
  return startJourney(request, h)
}

export const resumeByUser = (request, h) => {
  const journey = records.load({ userId: session.userId(request) })
  if (!journey) return startJourney(request, h)
  session.setActiveJourney(h, journey.journeyId)
  return journey
}
