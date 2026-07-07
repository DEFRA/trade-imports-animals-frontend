import { BASE } from '../config.js'
import { session, JOURNEY_COOKIE } from './persistence/session.js'
import { records } from './persistence/records.js'

/**
 * The journey-isolation seam — the one place a request is tied to a Journey
 * document. It now composes the two persistence ports: SESSION answers "who is
 * the user" + "which journey is active this session" (the cookie), and RECORDS
 * is the durable store. The journeyId rides in a cookie path-scoped to BASE (no
 * {id} URL segment), so this spike can never read another spike's cookie and
 * parallel browser contexts each carry their own journey. Load-or-create per
 * request; a fresh journey per Start now.
 */
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

/** Mint a fresh journey, stamp its user, and pin it as active (Start now). */
export const startJourney = (request, h) => {
  const journey = records.create({ userId: session.userId(request) })
  session.setActiveJourney(h, journey.journeyId)
  return journey
}

/** Resume the active journey while it exists, else mint a fresh one. */
export const currentJourney = (request, h) => {
  const journeyId = session.activeJourneyId(request)
  if (journeyId && records.has(journeyId)) return records.load({ journeyId })
  return startJourney(request, h)
}

/**
 * Cookieless resume — find this user's durable journey by userId and re-pin it,
 * else mint a fresh one. The active-journey pointer (cookie) is NOT needed;
 * identity alone recovers the journey. Prod: recover the application after a new
 * device / cleared cookie by the authenticated Defra ID subject.
 */
export const resumeByUser = (request, h) => {
  const journey = records.load({ userId: session.userId(request) })
  if (!journey) return startJourney(request, h)
  session.setActiveJourney(h, journey.journeyId)
  return journey
}
