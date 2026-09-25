import {
  addressHandshakeTokensCookie,
  flowOnlyAnswersCookie,
  knownJourneysCookie,
  openingRunCookie
} from './engine/persistence/session.js'
import { unconfiguredSeamsOf, withSetContext } from './shared/set-context.js'

/**
 * Boot-time completeness gate for a mounted set.
 *
 * Every seam has a fallback for the set that never configured it, and with one
 * set mounted those fallbacks were unreachable. With several mounted they are
 * one forgotten call away, and two of them answer benignly rather than
 * throwing: the journey flow hands back no sections and no task rows, and the
 * session hands back the shared default cookie names. A set that forgets one
 * therefore renders an empty dashboard to a real user instead of failing.
 *
 * Refusing at registration turns that into a boot failure. The fallbacks
 * themselves are left exactly as they are — they simply stop being reachable.
 */

const cookieNamesOf = (setId) =>
  withSetContext(setId, () => [
    knownJourneysCookie(),
    openingRunCookie(),
    flowOnlyAnswersCookie(),
    addressHandshakeTokensCookie()
  ])

/**
 * The cookies `registerJourneyCookie` should have registered for this set.
 *
 * It reads its names off the configured session seam, so calling it BEFORE
 * `configureSession` registers the shared defaults instead and the set then
 * reads cookies nobody set. Comparing the registered names against the
 * configured ones catches that ordering without the gateway having to declare
 * it.
 */
const assertJourneyCookiesRegistered = (server, setId) => {
  const registered = server?.states?.cookies ?? {}
  const missing = cookieNamesOf(setId).filter((name) => !registered[name])
  if (missing.length) {
    throw new Error(
      `Set "${setId}" mounted without its journey cookies: ${missing.join(', ')} — ` +
        'registerJourneyCookie() must run, and must run after configureSession()'
    )
  }
}

const assertSeamsConfigured = (setId) => {
  const missing = unconfiguredSeamsOf(setId)
  if (missing.length) {
    throw new Error(
      `Set "${setId}" mounted without configuring: ${missing.join(', ')}`
    )
  }
}

/**
 * Refuse to mount a set that has not configured every required seam.
 *
 * Called by a set's gateway as the last act of its plugin registration, so a
 * gap fails `server.register` and the server never starts.
 *
 * @param {object} server - the Hapi server the set is registering on.
 * @param {string} setId - the set being mounted.
 * @throws {Error} naming the set and every seam it left unconfigured.
 */
export const assertSetConfigured = (server, setId) => {
  assertSeamsConfigured(setId)
  assertJourneyCookiesRegistered(server, setId)
}
