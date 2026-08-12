import Jwt from '@hapi/jwt'

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

/**
 * Replaces the real Defra ID OIDC round-trip when auth.stubMode is on
 * (see mode.js / plugins/auth.js). Auth is still enforced everywhere else -
 * this only produces the same end state the real sign-in-oidc handler does
 * (cached session + session cookie), signed locally rather than verified
 * against a real identity provider.
 */
export const stubSignInRoutes = {
  plugin: {
    name: 'stub-sign-in-routes',
    register(server) {
      server.route({
        method: 'GET',
        path: '/auth/stub-sign-in',
        options: { auth: false },
        handler: async (request, h) => {
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

          return h.redirect(request.query.redirect ?? '/')
        }
      })
    }
  }
}
