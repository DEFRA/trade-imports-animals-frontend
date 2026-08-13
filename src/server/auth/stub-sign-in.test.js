import { describe, expect, test } from 'vitest'
import Hapi from '@hapi/hapi'
import { stubSignInRoutes } from './stub-sign-in.js'

const HTTP_STATUS_FOUND = 302

/** The plugin needs two things the real server provides: a session cache to
 * write into, and `request.cookieAuth`. Stubbing them keeps the test to the
 * plugin's own behaviour rather than the whole auth stack. */
const buildServer = async () => {
  const server = Hapi.server()
  const cached = new Map()
  const cookiesSet = []

  server.app.cache = {
    set: async (key, value) => cached.set(key, value),
    get: async (key) => cached.get(key)
  }
  server.ext('onRequest', (request, h) => {
    request.cookieAuth = { set: (value) => cookiesSet.push(value) }
    return h.continue
  })

  await server.register(stubSignInRoutes)
  return { server, cached, cookiesSet }
}

describe('stub sign-in', () => {
  test.each(['/auth/stub-sign-in', '/auth/sign-in'])(
    'Should mint a session at %s',
    async (path) => {
      // Both paths sign the caller in. /auth/sign-in matters because it is where
      // the session cookie and the unauthorised page already send people, and in
      // stub mode the real route that would serve it is not registered.
      const { server, cached, cookiesSet } = await buildServer()

      const response = await server.inject({ method: 'GET', url: path })

      expect(response.statusCode).toBe(HTTP_STATUS_FOUND)
      expect(cookiesSet).toHaveLength(1)
      const session = cached.get(cookiesSet[0].sessionId)
      expect(session.isAuthenticated).toBe(true)
      expect(session.organisationId).toBe('stub-org-1')
      // Real Defra ID carries both keys and different readers use each.
      expect(session.currentRelationshipId).toBe('stub-org-1')
    }
  )

  test('Should take the organisation from the query when one is given', async () => {
    const { server, cached, cookiesSet } = await buildServer()

    await server.inject({
      method: 'GET',
      url: '/auth/stub-sign-in?organisationId=5900002'
    })

    const session = cached.get(cookiesSet[0].sessionId)
    expect(session.organisationId).toBe('5900002')
    expect(session.currentRelationshipId).toBe('5900002')
  })

  test('Should return to the page the caller was sent here from', async () => {
    // What the session cookie's redirectTo produces — a relative path, honoured.
    const { server } = await buildServer()

    const response = await server.inject({
      method: 'GET',
      url: '/auth/sign-in?redirect=%2Fdashboard%3Fpage%3D2'
    })

    expect(response.headers.location).toBe('/dashboard?page=2')
  })

  test('Should refuse to redirect off-site', async () => {
    // This route is unauthenticated and `redirect` is attacker-supplied, so an
    // absolute URL would turn sign-in into an open redirector.
    const { server } = await buildServer()

    const response = await server.inject({
      method: 'GET',
      url: '/auth/stub-sign-in?redirect=https%3A%2F%2Fevil.example.com%2Fharvest'
    })

    expect(response.headers.location).toBe('/')
  })

  test('Should redirect to the root when no destination is given', async () => {
    const { server } = await buildServer()

    const response = await server.inject({
      method: 'GET',
      url: '/auth/stub-sign-in'
    })

    expect(response.headers.location).toBe('/')
  })
})
