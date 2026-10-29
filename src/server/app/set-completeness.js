import { journeyCookieNames } from './engine/persistence/session.js'
import { unconfiguredSeamsOf, withSetContext } from './shared/set-context.js'

const cookieNamesOf = (setId) => withSetContext(setId, journeyCookieNames)

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
 * @param {object} server - the Hapi server the set is registering on.
 * @param {string} setId - the set being mounted.
 * @throws {Error} naming the set and every seam it left unconfigured, or
 * every journey cookie the set did not register.
 */
export const assertSetConfigured = (server, setId) => {
  assertSeamsConfigured(setId)
  assertJourneyCookiesRegistered(server, setId)
}
