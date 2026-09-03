import { vi } from 'vitest'
import { createServer } from '../server.js'
import { config } from '../../config/config.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { mockOidcConfig } from '../common/test-helpers/mock-oidc-config.js'
import { verifyToken } from '../../auth/verify-token.js'

vi.mock('../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

vi.mock('../../config/config.js', async (importOriginal) => {
  const { mockAuthConfig } =
    await import('../common/test-helpers/mock-auth-config.js')
  return mockAuthConfig(importOriginal)
})

vi.mock('../../auth/verify-token.js', () => ({
  verifyToken: vi.fn()
}))

const defraIdAuth = () => ({
  strategy: 'defra-id',
  credentials: {
    profile: {
      sessionId: 'signin-oidc-session',
      crn: 'CRN123',
      organisationId: 'org-1'
    },
    token: 'mock-token',
    refreshToken: 'mock-refresh-token'
  }
})

const joinedSetCookie = (headers) => {
  const setCookie = headers['set-cookie'] ?? []
  const cookies = Array.isArray(setCookie) ? setCookie : [setCookie]
  return cookies.join('\n')
}

describe('#authController', () => {
  const originalMode = config.get('stubMode')
  let server

  beforeAll(async () => {
    config.set('stubMode', false)
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => [] }))
    )
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
    vi.unstubAllGlobals()
    config.set('stubMode', originalMode)
  })

  test('GET /auth/sign-in-oidc renders unauthorised when token verification fails', async () => {
    verifyToken.mockRejectedValue(new Error('Client request timeout'))

    const { statusCode, result, headers } = await server.inject({
      method: 'GET',
      url: '/auth/sign-in-oidc',
      auth: defraIdAuth()
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain('Sorry, we are unable to sign you in')
    expect(verifyToken).toHaveBeenCalledWith('mock-token')
    expect(joinedSetCookie(headers)).not.toContain('sid=')
  })
})
