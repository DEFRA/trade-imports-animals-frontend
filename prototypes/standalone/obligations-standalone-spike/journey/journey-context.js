import { journeyRepository } from '../store/index.js'
import { BASE, FLOW_ID } from './config.js'

/**
 * THE journey-isolation seam — the one place a request is tied to a
 * Journey document. The journeyId rides in a cookie path-scoped to BASE
 * (no {id} URL segment — see journey/paths.js), so this spike can never
 * read another spike's cookie and parallel browser contexts each carry
 * their own journey. Load-or-create per request; a fresh journey per
 * Start now; never a shared default document.
 *
 * `repository` is injectable for tests; production callers share the
 * store's app-level singleton.
 */

export const JOURNEY_COOKIE = 'obligationsJourneyId'

export const journeyCookieOptions = Object.freeze({
  path: BASE,
  ttl: null,
  encoding: 'none',
  isSecure: false,
  isHttpOnly: true,
  isSameSite: 'Lax',
  clearInvalid: true,
  strictHeader: true
})

/** Define the cookie once, at plugin registration. */
export const registerJourneyCookie = (server) =>
  server.state(JOURNEY_COOKIE, journeyCookieOptions)

export const startJourney = (h, options = {}) => {
  const { repository = journeyRepository } = options
  const journey = repository.create(FLOW_ID)
  h.state(JOURNEY_COOKIE, journey.journeyId)
  return journey
}

/**
 * Load-or-create for every other request: resume the cookie's journey
 * while it still exists, otherwise mint a fresh one (absent, stale or
 * cleared-invalid cookies all land here).
 */
export const currentJourney = (request, h, options = {}) => {
  const { repository = journeyRepository } = options
  const journeyId = request.state?.[JOURNEY_COOKIE]
  if (journeyId && repository.has(journeyId)) {
    return repository.get(journeyId)
  }
  return startJourney(h, options)
}
