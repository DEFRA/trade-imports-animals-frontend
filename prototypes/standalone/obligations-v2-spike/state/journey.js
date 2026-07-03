import { BASE } from '../config.js'
import { store } from './store.js'

/**
 * The journey-isolation seam — the one place a request is tied to a
 * Journey document. The journeyId rides in a cookie path-scoped to BASE
 * (no {id} URL segment), so this spike can never read another spike's
 * cookie and parallel browser contexts each carry their own journey.
 * Load-or-create per request; a fresh journey per Start now.
 */
export const JOURNEY_COOKIE = 'obligationsV2JourneyId'

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

/** Mint a fresh journey and set the cookie (Start now). */
export const startJourney = (h) => {
  const journey = store.create()
  h.state(JOURNEY_COOKIE, journey.journeyId)
  return journey
}

/** Resume the cookie's journey while it exists, else mint a fresh one. */
export const currentJourney = (request, h) => {
  const journeyId = request.state?.[JOURNEY_COOKIE]
  if (journeyId && store.has(journeyId)) {
    return store.get(journeyId)
  }
  return startJourney(h)
}
