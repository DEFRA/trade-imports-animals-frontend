import { describe, expect, test, vi, beforeEach } from 'vitest'
import { authPlugin, getBellOptions, getCookieOptions } from './auth.js'

const getOidcConfigMock = vi.hoisted(() => vi.fn())
const configGetMock = vi.hoisted(() => vi.fn())
const refreshTokensMock = vi.hoisted(() => vi.fn())
const getSafeRedirectMock = vi.hoisted(() => vi.fn())

const jwtDecodeMock = vi.hoisted(() => vi.fn())
const jwtVerifyTimeMock = vi.hoisted(() => vi.fn())

vi.mock('../auth/get-oidc-config.js', () => ({
  getOidcConfig: getOidcConfigMock
}))

vi.mock('../config/config.js', () => ({
  config: {
    get: configGetMock
  }
}))

vi.mock('../auth/refresh-tokens.js', () => ({
  refreshTokens: refreshTokensMock
}))

vi.mock('../auth/get-safe-redirect.js', () => ({
  getSafeRedirect: getSafeRedirectMock
}))

vi.mock('@hapi/jwt', () => ({
  default: {
    token: {
      decode: jwtDecodeMock,
      verifyTime: jwtVerifyTimeMock
    }
  }
}))

describe('auth plugin', () => {
  const oidcConfig = {
    authorization_endpoint: 'https://idp.example.com/auth',
    token_endpoint: 'https://idp.example.com/token'
  }

  beforeEach(() => {
    vi.clearAllMocks()

    getOidcConfigMock.mockResolvedValue(oidcConfig)

    configGetMock.mockImplementation((key) => {
      const map = {
        'defraId.clientId': 'test-client-id',
        'defraId.clientSecret': 'test-client-secret',
        'session.cookie.password': 'some-password-32-chars-long-000000',
        isProduction: false,
        'session.cookie.sameSite': 'Lax',
        'defraId.redirectUrl': 'http://localhost:3000/auth/sign-in-oidc',
        'defraId.serviceId': 'service-123',
        'defraId.policy': 'policy-abc',
        'defraId.refreshTokens': true
      }

      return map[key]
    })
  })

  test('register registers Bell + cookie strategies and sets default auth to session', async () => {
    const server = {
      auth: {
        strategy: vi.fn(),
        default: vi.fn()
      }
    }

    await authPlugin.plugin.register(server)

    expect(getOidcConfigMock).toHaveBeenCalledTimes(1)

    expect(server.auth.strategy).toHaveBeenCalledWith(
      'defra-id',
      'bell',
      expect.objectContaining({
        provider: expect.objectContaining({
          auth: oidcConfig.authorization_endpoint,
          token: oidcConfig.token_endpoint
        }),
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        password: expect.any(String)
      })
    )

    expect(server.auth.strategy).toHaveBeenCalledWith(
      'session',
      'cookie',
      expect.objectContaining({
        cookie: expect.objectContaining({
          password: expect.any(String),
          path: '/'
        }),
        redirectTo: expect.any(Function),
        validate: expect.any(Function)
      })
    )

    expect(server.auth.default).toHaveBeenCalledWith('session')
  })

  test('getBellOptions.location stores safe redirect and returns redirectUrl', () => {
    const options = getBellOptions(oidcConfig)

    const request = {
      query: { redirect: '/some/path?x=1' },
      yar: {
        set: vi.fn()
      }
    }

    getSafeRedirectMock.mockReturnValue('/safe/redirect')

    const location = options.location(request)

    expect(getSafeRedirectMock).toHaveBeenCalledWith('/some/path?x=1')
    expect(request.yar.set).toHaveBeenCalledWith('redirect', '/safe/redirect')
    expect(location).toBe('http://localhost:3000/auth/sign-in-oidc')
  })

  test('getBellOptions.providerParams adds forceReselection for /auth/organisation', () => {
    const options = getBellOptions(oidcConfig)

    const base = options.providerParams({
      path: '/some/other-path',
      query: {}
    })

    expect(base).toEqual({
      serviceId: 'service-123',
      p: 'policy-abc',
      response_mode: 'query'
    })

    const withForce = options.providerParams({
      path: '/auth/organisation',
      query: {}
    })

    expect(withForce).toEqual({
      serviceId: 'service-123',
      p: 'policy-abc',
      response_mode: 'query',
      forceReselection: true
    })

    const withRelationshipId = options.providerParams({
      path: '/auth/organisation',
      query: { organisationId: 'org-999' }
    })

    expect(withRelationshipId).toEqual({
      serviceId: 'service-123',
      p: 'policy-abc',
      response_mode: 'query',
      forceReselection: true,
      relationshipId: 'org-999'
    })
  })

  test('getBellOptions.provider.profile maps decoded JWT payload to credentials.profile', () => {
    const options = getBellOptions(oidcConfig)

    const credentials = { token: 'jwt-token' }
    jwtDecodeMock.mockReturnValue({
      decoded: {
        payload: {
          contactId: 'CRN123',
          firstName: 'Andrew',
          lastName: 'Farmer',
          currentRelationshipId: 'REL-1'
        }
      }
    })

    options.provider.profile(credentials)

    expect(credentials.profile).toEqual({
      contactId: 'CRN123',
      firstName: 'Andrew',
      lastName: 'Farmer',
      currentRelationshipId: 'REL-1',
      crn: 'CRN123',
      name: 'Andrew Farmer',
      organisationId: 'REL-1'
    })
  })

  describe('getCookieOptions', () => {
    test('redirectTo builds /auth/sign-in redirect including pathname and search', () => {
      const options = getCookieOptions()

      const redirect = options.redirectTo({
        url: {
          pathname: '/origin',
          search: '?a=1'
        }
      })

      expect(redirect).toBe('/auth/sign-in?redirect=/origin?a=1')
    })

    test('validate returns isValid:false when session does not exist in cache', async () => {
      const options = getCookieOptions()

      const request = {
        server: {
          app: {
            cache: {
              get: vi.fn().mockResolvedValue(null)
            }
          }
        }
      }

      const res = await options.validate(request, { sessionId: 'missing' })
      expect(res).toEqual({ isValid: false })
    })

    test('validate returns isValid:true when token verification succeeds', async () => {
      const options = getCookieOptions()
      const userSession = {
        token: 'token',
        refreshToken: 'refresh-token'
      }

      const request = {
        server: {
          app: {
            cache: {
              get: vi.fn().mockResolvedValue(userSession),
              set: vi.fn()
            }
          }
        }
      }

      jwtDecodeMock.mockReturnValue({ exp: 999999 })
      jwtVerifyTimeMock.mockImplementation(() => undefined)

      const res = await options.validate(request, { sessionId: 'session-1' })

      expect(res).toEqual({ isValid: true, credentials: userSession })
      expect(refreshTokensMock).not.toHaveBeenCalled()
      expect(request.server.app.cache.set).not.toHaveBeenCalled()
    })

    test('validate refreshes tokens when verification fails and refreshTokens enabled', async () => {
      const options = getCookieOptions()
      const userSession = {
        token: 'old-token',
        refreshToken: 'old-refresh'
      }

      const request = {
        server: {
          app: {
            cache: {
              get: vi.fn().mockResolvedValue(userSession),
              set: vi.fn()
            }
          }
        }
      }

      jwtDecodeMock.mockReturnValue({ exp: 1 })
      jwtVerifyTimeMock.mockImplementation(() => {
        throw new Error('token expired')
      })

      refreshTokensMock.mockResolvedValue({
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token'
      })

      const res = await options.validate(request, { sessionId: 'session-1' })

      expect(refreshTokensMock).toHaveBeenCalledWith('old-refresh')
      expect(request.server.app.cache.set).toHaveBeenCalledWith('session-1', {
        ...userSession,
        token: 'new-access-token',
        refreshToken: 'new-refresh-token'
      })

      expect(res).toEqual({
        isValid: true,
        credentials: {
          ...userSession,
          token: 'new-access-token',
          refreshToken: 'new-refresh-token'
        }
      })
    })

    test('validate returns isValid:false when verification fails and refreshTokens disabled', async () => {
      configGetMock.mockImplementation((key) => {
        if (key === 'defraId.refreshTokens') return false

        const map = {
          'defraId.clientId': 'test-client-id',
          'defraId.clientSecret': 'test-client-secret',
          'session.cookie.password': 'some-password-32-chars-long-000000',
          isProduction: false,
          'session.cookie.sameSite': 'Lax',
          'defraId.redirectUrl': 'http://localhost:3000/auth/sign-in-oidc',
          'defraId.serviceId': 'service-123',
          'defraId.policy': 'policy-abc',
          'defraId.refreshTokens': false
        }

        return map[key]
      })

      const options = getCookieOptions()
      const userSession = {
        token: 'old-token',
        refreshToken: 'old-refresh'
      }

      const request = {
        server: {
          app: {
            cache: {
              get: vi.fn().mockResolvedValue(userSession),
              set: vi.fn()
            }
          }
        }
      }

      jwtDecodeMock.mockReturnValue({ exp: 1 })
      jwtVerifyTimeMock.mockImplementation(() => {
        throw new Error('token expired')
      })

      const res = await options.validate(request, { sessionId: 'session-1' })

      expect(res).toEqual({ isValid: false })
      expect(refreshTokensMock).not.toHaveBeenCalled()
      expect(request.server.app.cache.set).not.toHaveBeenCalled()
    })
  })
})
