import { vi } from 'vitest'
import { createServer } from '../server.js'
import { config } from '../../config/config.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { mockOidcConfig } from '../common/test-helpers/mock-oidc-config.js'
import { sessionAuth } from '../common/test-helpers/session-auth.js'
import { verifyToken } from '../../auth/verify-token.js'
import { getPermissions } from '../../auth/get-permissions.js'
import { copy as sharedEn } from '../app/shared/copy.en.js'

vi.mock('../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

vi.mock('../../config/config.js', async (importOriginal) => {
  const { mockAuthConfig } =
    await import('../common/test-helpers/mock-auth-config.js')
  return mockAuthConfig(importOriginal)
})

vi.mock('../../auth/get-sign-out-url.js', () => ({
  getSignOutUrl: vi.fn().mockResolvedValue('/signed-out')
}))

vi.mock('../../auth/verify-token.js', () => ({
  verifyToken: vi.fn()
}))

vi.mock('../../auth/get-permissions.js', () => ({
  getPermissions: vi.fn()
}))

const HTTP_STATUS_FOUND = 302
const MOCK_TOKEN = 'mock-token'
const SIGNED_OUT_URL = '/signed-out'

const defraIdAuth = (profileOverrides = {}) => ({
  strategy: 'defra-id',
  credentials: {
    profile: {
      sessionId: 'signin-oidc-session',
      crn: 'CRN123',
      organisationId: 'org-1',
      ...profileOverrides
    },
    token: MOCK_TOKEN,
    refreshToken: 'mock-refresh-token'
  }
})

const expectSessionCookieCleared = (headers) => {
  const setCookie = headers['set-cookie'] ?? []
  const cookies = Array.isArray(setCookie) ? setCookie : [setCookie]
  expect(cookies.join('\n')).toContain('sid=')
}

describe('#authController', () => {
  const originalMode = config.get('stubMode')
  let server

  const signInOidc = (profileOverrides) =>
    server.inject({
      method: 'GET',
      url: '/auth/sign-in-oidc',
      auth: defraIdAuth(profileOverrides)
    })

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

  test('GET /auth/sign-in redirects to home', async () => {
    const { statusCode, headers } = await server.inject({
      method: 'GET',
      url: '/auth/sign-in',
      auth: {
        strategy: 'defra-id',
        credentials: {}
      }
    })

    expect(statusCode).toBe(HTTP_STATUS_FOUND)
    expect(headers.location).toBe('/')
  })

  test('GET /auth/sign-out redirects unauthenticated users to home', async () => {
    const { statusCode, headers } = await server.inject({
      method: 'GET',
      url: '/auth/sign-out'
    })

    expect(statusCode).toBe(HTTP_STATUS_FOUND)
    expect(headers.location).toBe('/')
  })

  test('GET /auth/sign-out drops the session and redirects authenticated users to the sign-out URL', async () => {
    const sessionId = 'signout-authenticated'
    await server.app.cache.set(sessionId, { sessionId, token: MOCK_TOKEN })

    const { statusCode, headers } = await server.inject({
      method: 'GET',
      url: '/auth/sign-out',
      auth: sessionAuth(sessionId)
    })

    expect(statusCode).toBe(HTTP_STATUS_FOUND)
    expect(headers.location).toBe(SIGNED_OUT_URL)
    expect(await server.app.cache.get(sessionId)).toBeNull()
    expectSessionCookieCleared(headers)
  })

  test('GET /auth/sign-out-oidc redirects unauthenticated users to home', async () => {
    const { statusCode, headers } = await server.inject({
      method: 'GET',
      url: '/auth/sign-out-oidc'
    })

    expect(statusCode).toBe(HTTP_STATUS_FOUND)
    expect(headers.location).toBe('/')
  })

  test('GET /auth/sign-out-oidc clears authenticated session and redirects', async () => {
    const sessionId = 'signout-oidc-authenticated'
    await server.app.cache.set(sessionId, { sessionId, token: MOCK_TOKEN })

    const { statusCode, headers } = await server.inject({
      method: 'GET',
      url: '/auth/sign-out-oidc',
      auth: sessionAuth(sessionId)
    })

    expect(statusCode).toBe(HTTP_STATUS_FOUND)
    expect(headers.location).toBe(SIGNED_OUT_URL)
    expect(await server.app.cache.get(sessionId)).toBeNull()
    expectSessionCookieCleared(headers)
  })

  test('GET /auth/sign-in-oidc renders unauthorised when organisationId is missing', async () => {
    const { statusCode, payload, headers } = await signInOidc({
      organisationId: null
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(payload).toContain(sharedEn.unauthorised.heading)
    expect(headers['set-cookie'] ?? []).not.toContainEqual(
      expect.stringContaining('sid=')
    )
    expect(verifyToken).not.toHaveBeenCalled()
    expect(getPermissions).not.toHaveBeenCalled()
  })

  test('GET /auth/sign-in-oidc renders unauthorised when token verification fails', async () => {
    verifyToken.mockRejectedValue(new Error('Client request timeout'))

    const { statusCode, payload, headers } = await signInOidc()

    expect(statusCode).toBe(statusCodes.ok)
    expect(payload).toContain(sharedEn.unauthorised.heading)
    expect(payload).toContain(
      `${sharedEn.unauthorised.title} | ${sharedEn.layout.serviceName}`
    )
    expect(headers['set-cookie'] ?? []).not.toContainEqual(
      expect.stringContaining('sid=')
    )
    expect(getPermissions).not.toHaveBeenCalled()
  })

  test('GET /auth/sign-in-oidc renders unauthorised when getPermissions fails', async () => {
    verifyToken.mockResolvedValue(undefined)
    getPermissions.mockRejectedValue(new Error('Permissions API unavailable'))

    const { statusCode, payload, headers } = await signInOidc()

    expect(statusCode).toBe(statusCodes.ok)
    expect(payload).toContain(sharedEn.unauthorised.heading)
    expect(headers['set-cookie'] ?? []).not.toContainEqual(
      expect.stringContaining('sid=')
    )
    expect(verifyToken).toHaveBeenCalledWith(MOCK_TOKEN)
    expect(getPermissions).toHaveBeenCalledWith('CRN123', 'org-1', MOCK_TOKEN)
  })
})
