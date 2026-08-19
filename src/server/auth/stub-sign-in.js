import Jwt from '@hapi/jwt'

import { getSafeRedirect } from '../../auth/get-safe-redirect.js'

const STUB_TOKEN_SECRET = 'animals-frontend-stub-auth-local-signing-key'
const HOURS_IN_STUB_SESSION = 4
const SECONDS_PER_MINUTE = 60
const MINUTES_PER_HOUR = 60
const STUB_SESSION_TTL_SECONDS =
  HOURS_IN_STUB_SESSION * MINUTES_PER_HOUR * SECONDS_PER_MINUTE
const MS_PER_SECOND = 1000

const DEFAULT_STUB_USER = {
  crn: 'STUB0001',
  contactId: 2100010101,
  name: 'Stub User',
  email: 'stub.user@example.com',
  organisationId: 'stub-org-1'
}

function buildStubToken(sessionId) {
  const nowSeconds = Math.floor(Date.now() / MS_PER_SECOND)
  return Jwt.token.generate(
    { sessionId, exp: nowSeconds + STUB_SESSION_TTL_SECONDS },
    STUB_TOKEN_SECRET
  )
}

const signIn = async (request, h) => {
  const sessionId = crypto.randomUUID()
  const token = buildStubToken(sessionId)
  const organisationId =
    request.query.organisationId ?? DEFAULT_STUB_USER.organisationId

  await request.server.app.cache.set(sessionId, {
    isAuthenticated: true,
    sessionId,
    crn: DEFAULT_STUB_USER.crn,
    contactId: DEFAULT_STUB_USER.contactId,
    name: DEFAULT_STUB_USER.name,
    email: DEFAULT_STUB_USER.email,
    // Real Defra ID maps organisationId from currentRelationshipId; both
    // are read downstream (organisationIdOf / buildActor).
    organisationId,
    currentRelationshipId: organisationId,
    role: 'Farmer',
    scope: ['user'],
    token,
    refreshToken: 'stub-refresh-token'
  })

  request.cookieAuth.set({ sessionId })

  // Sanitised for the same reason the real handlers sanitise it: this route is
  // unauthenticated and `redirect` comes off the query string, so an absolute
  // URL would make sign-in a redirector to anywhere. The cookie strategy sends
  // people here with a relative path, which survives unchanged.
  return h.redirect(getSafeRedirect(request.query.redirect))
}

/** Both paths mint the same stub session.
 *
 * `/auth/sign-in` is registered as well as the explicit stub path because it is
 * what the rest of the service already points at — the session cookie's
 * `redirectTo` (plugins/auth.js) and the "try again" link on unauthorised.njk —
 * and in stub mode the real route that would serve it is not registered at all
 * (server.js swaps authRoutes for this plugin), so an unauthenticated request
 * would otherwise be redirected to a 404 instead of being signed in. */
const SIGN_IN_PATHS = ['/auth/stub-sign-in', '/auth/sign-in']

/**
 * Replaces the real Defra ID OIDC round-trip when stub mode is on
 * (see mode.js / plugins/auth.js). Auth is still enforced everywhere else -
 * this only produces the same end state the real sign-in-oidc handler does
 * (cached session + session cookie), signed locally rather than verified
 * against a real identity provider.
 */
export const stubSignInRoutes = {
  plugin: {
    name: 'stub-sign-in-routes',
    register(server) {
      server.route(
        SIGN_IN_PATHS.map((path) => ({
          method: 'GET',
          path,
          options: { auth: false },
          handler: signIn
        }))
      )
    }
  }
}
