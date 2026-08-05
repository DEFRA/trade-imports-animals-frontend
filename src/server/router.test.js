import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { config } from '../config/config.js'
import { createServer } from './server.js'
import { DEFAULT_SET_BASE } from './router.js'
import { authenticatedCredentials } from './app/engine/test-support.js'
import { SESSION_COOKIE_NAMES } from './app/sets/live-animals/journeys/linear/config.js'
import { mockOidcConfig } from './common/test-helpers/mock-oidc-config.js'

vi.mock('../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

const authenticated = {
  strategy: 'session',
  credentials: authenticatedCredentials
}

describe('server-wide and set-prefixed routes', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  it('redirects the server root to the named default set with a temporary redirect', async () => {
    const response = await server.inject({ url: '/', auth: authenticated })

    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toBe(DEFAULT_SET_BASE)
  })

  it('keeps signout unprefixed', async () => {
    const response = await server.inject({
      url: '/signout',
      auth: authenticated
    })

    expect(response.statusCode).not.toBe(404)
  })

  it('keeps health, OIDC and static assets server-wide', async () => {
    const health = await server.inject('/health')
    const oidc = await server.inject('/auth/sign-out-oidc')
    const asset = await server.inject(
      `${config.get('assetPath')}/assets/images/govuk-crest.svg`
    )

    expect(health.statusCode).toBe(200)
    expect(oidc.statusCode).not.toBe(404)
    expect(asset.statusCode).toBe(200)
  })

  it('serves the dashboard only from the live-animals namespace', async () => {
    const sessionId = 'ROUTER_TEST_SESSION'
    const credentials = { ...authenticatedCredentials, sessionId }
    await server.app.cache.set(sessionId, credentials)
    const dashboard = await server.inject({
      url: '/live-animals',
      auth: { strategy: 'session', credentials }
    })
    const oldShape = await server.inject({
      url: '/notifications/x',
      auth: authenticated
    })

    expect(dashboard.statusCode).toBe(200)
    expect(oldShape.statusCode).toBe(404)
  })

  it('path-scopes every live-animals journey cookie to its set subtree', () => {
    for (const cookieName of Object.values(SESSION_COOKIE_NAMES)) {
      expect(server.states.cookies[cookieName].path).toBe('/live-animals')
    }
  })
})
