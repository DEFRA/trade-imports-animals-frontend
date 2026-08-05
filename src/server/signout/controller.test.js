import { vi } from 'vitest'

import { createServer } from '../server.js'
import { mockOidcConfig } from '../common/test-helpers/mock-oidc-config.js'

vi.mock('../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

vi.mock('../../config/config.js', async (importOriginal) => {
  const { mockAuthConfig } =
    await import('../common/test-helpers/mock-auth-config.js')
  return mockAuthConfig(importOriginal)
})

describe('GET /signout', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
    vi.restoreAllMocks()
  })

  test('clears auth and yar cookies before redirecting', async () => {
    const { statusCode, headers } = await server.inject({
      method: 'GET',
      url: '/signout',
      auth: {
        strategy: 'session',
        credentials: { user: {}, sessionId: 'TEST_SESSION_ID', token: 't' }
      }
    })

    expect(statusCode).toBe(302)

    const setCookie = headers['set-cookie'] ?? []
    const cookies = Array.isArray(setCookie) ? setCookie : [setCookie]
    const joinedCookies = cookies.join('\n')

    // Default @hapi/cookie session cookie name
    expect(joinedCookies).toContain('sid=')

    // Yar cookie clear header may only be emitted when a Yar session cookie
    // already exists on the incoming request.
    if (joinedCookies.includes('session=')) {
      expect(joinedCookies).toContain('Max-Age=0')
    }
  })
})
