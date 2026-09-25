import { describe, expect, test } from 'vitest'
import Cookie from '@hapi/cookie'
import Hapi from '@hapi/hapi'
import { stubSignInRoutes } from './stub-sign-in.js'

const HTTP_STATUS_FOUND = 302
const COOKIE_PASSWORD = 'stub-sign-in-test-cookie-password-32-chars-long'

const buildServer = async () => {
  const server = Hapi.server()
  const cached = new Map()

  server.app.cache = {
    set: async (key, value) => cached.set(key, value),
    get: async (key) => cached.get(key) ?? null,
    drop: async (key) => cached.delete(key)
  }
  await server.register(Cookie)
  server.auth.strategy('session', 'cookie', {
    cookie: { password: COOKIE_PASSWORD, isSecure: false },
    validate: async (_request, session) => {
      const userSession = cached.get(session.sessionId)
      return userSession
        ? { isValid: true, credentials: userSession }
        : { isValid: false }
    }
  })
  server.auth.default('session')
  await server.register(stubSignInRoutes)
  return { server, cached }
}

const sessionCookieOf = (response) => {
  const setCookie = response.headers['set-cookie'] ?? []
  const cookies = Array.isArray(setCookie) ? setCookie : [setCookie]
  return cookies.find((cookie) => cookie.startsWith('sid=')).split(';')[0]
}

const onlySession = (cached) => [...cached.values()][0]

describe('stub sign-in', () => {
  test.each(['/auth/stub-sign-in', '/auth/sign-in'])(
    'Should mint a session at %s',
    async (path) => {
      // Both paths sign the caller in. /auth/sign-in matters because it is where
      // the session cookie and the unauthorised page already send people, and in
      // stub mode the real route that would serve it is not registered.
      const { server, cached } = await buildServer()

      const response = await server.inject({ method: 'GET', url: path })

      expect(response.statusCode).toBe(HTTP_STATUS_FOUND)
      expect(sessionCookieOf(response)).not.toBe('sid=')
      expect(cached.size).toBe(1)
      const session = onlySession(cached)
      expect(session.isAuthenticated).toBe(true)
      expect(session.contactId).toBe(2100010101)
      expect(session.organisationId).toBe('stub-org-1')
      // Real Defra ID carries both keys and different readers use each.
      expect(session.currentRelationshipId).toBe('stub-org-1')
    }
  )

  test('Should take the organisation from the query when one is given', async () => {
    const { server, cached } = await buildServer()

    await server.inject({
      method: 'GET',
      url: '/auth/stub-sign-in?organisationId=5900002'
    })

    const session = onlySession(cached)
    expect(session.organisationId).toBe('5900002')
    expect(session.currentRelationshipId).toBe('5900002')
  })

  /** Where sign-in sends the caller afterwards. The route is unauthenticated and
   * `redirect` is attacker-supplied, so only a relative path is honoured — the
   * shape the session cookie's own redirectTo produces. An absolute URL would
   * turn sign-in into an open redirector, so it falls back to the root, as does
   * a request that names no destination at all. */
  test.each([
    {
      case: 'returns to the page the caller was sent here from',
      url: '/auth/sign-in?redirect=%2Fdashboard%3Fpage%3D2',
      location: '/dashboard?page=2'
    },
    {
      case: 'refuses to redirect off-site',
      url: '/auth/stub-sign-in?redirect=https%3A%2F%2Fevil.example.com%2Fharvest',
      location: '/'
    },
    {
      case: 'redirects to the root when no destination is given',
      url: '/auth/stub-sign-in',
      location: '/'
    }
  ])('Should $case', async ({ url, location }) => {
    const { server } = await buildServer()

    const response = await server.inject({ method: 'GET', url })

    expect(response.headers.location).toBe(location)
  })
})

describe('stub sign-out', () => {
  test('Should drop the session, clear the cookie and land on the root', async () => {
    const { server, cached } = await buildServer()
    const signedIn = await server.inject({
      method: 'GET',
      url: '/auth/sign-in'
    })

    const response = await server.inject({
      method: 'GET',
      url: '/auth/sign-out',
      headers: { cookie: sessionCookieOf(signedIn) }
    })

    expect(response.statusCode).toBe(HTTP_STATUS_FOUND)
    expect(response.headers.location).toBe('/')
    expect(cached.size).toBe(0)
    expect(sessionCookieOf(response)).toBe('sid=')
  })

  test('Should land a caller with no session on the root', async () => {
    const { server, cached } = await buildServer()

    const response = await server.inject({
      method: 'GET',
      url: '/auth/sign-out'
    })

    expect(response.statusCode).toBe(HTTP_STATUS_FOUND)
    expect(response.headers.location).toBe('/')
    expect(cached.size).toBe(0)
  })
})
