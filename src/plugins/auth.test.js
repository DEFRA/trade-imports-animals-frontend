import hapi from '@hapi/hapi'
import hapiBell from '@hapi/bell'
import hapiCookie from '@hapi/cookie'
import Jwt from '@hapi/jwt'
import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest'
import { authPlugin, getBellOptions, getCookieOptions } from './auth.js'
import { config } from '../config/config.js'
import {
  callCounts,
  callCountsOf,
  newCallCounts
} from '../server/common/helpers/call-counts/call-counts.js'
import { callCountsRoutes } from '../server/common/helpers/call-counts/call-counts-routes.js'
import { clearCallCountTotals } from '../server/common/helpers/call-counts/call-count-totals.js'
import { createLogger } from '../server/common/helpers/logging/logger.js'
import { restoreConfigAfterEach } from '../server/common/test-helpers/restore-config-after-each.js'

const wreckGetMock = vi.hoisted(() => vi.fn())
const wreckPostMock = vi.hoisted(() => vi.fn())

vi.mock('@hapi/wreck', () => ({
  default: { get: wreckGetMock, post: wreckPostMock }
}))

const AUTH_COOKIE_NAME = 'test-auth-cookie'
const SIGN_IN_REDIRECT_URL = 'http://localhost:3000/auth/sign-in-oidc'

const configValues = {
  'defraId.clientId': 'test-client-id',
  'defraId.clientSecret': 'test-client-secret',
  'session.cookie.password': 'some-password-32-chars-long-000000',
  'auth.cookieName': AUTH_COOKIE_NAME,
  isProduction: false,
  stubMode: false,
  'defraId.stateCookieSameSite': 'Lax',
  'defraId.redirectUrl': SIGN_IN_REDIRECT_URL,
  'defraId.serviceId': 'service-123',
  'defraId.policy': 'policy-abc',
  'defraId.refreshTokens': true,
  'defraId.oidcDiscoveryUrl':
    'https://idp.example.com/.well-known/openid-configuration'
}

const sessionIdInCache = 'session-1'

const buildRequestWithCachedSession = (userSession) => {
  const sessions = new Map(userSession ? [[sessionIdInCache, userSession]] : [])
  return {
    sessions,
    request: {
      server: {
        app: {
          cache: {
            get: async (sessionId) => sessions.get(sessionId) ?? null,
            set: async (sessionId, value) => {
              sessions.set(sessionId, value)
            }
          }
        }
      }
    }
  }
}

const tokenExpiringIn = (ttlSec, payload = {}) =>
  Jwt.token.generate(
    payload,
    { key: 'test-token-signing-secret', algorithm: 'HS256' },
    { ttlSec }
  )

const SECONDS_PER_HOUR = 3600
const unexpiredToken = tokenExpiringIn(SECONDS_PER_HOUR)
const expiredToken = tokenExpiringIn(-SECONDS_PER_HOUR)

describe('auth plugin', () => {
  const oidcConfig = {
    authorization_endpoint: 'https://idp.example.com/auth',
    token_endpoint: 'https://idp.example.com/token'
  }

  restoreConfigAfterEach(Object.keys(configValues))

  let logSpy

  beforeEach(() => {
    vi.resetAllMocks()
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    for (const [key, value] of Object.entries(configValues)) {
      config.set(key, value)
    }
    wreckGetMock.mockResolvedValue({ payload: oidcConfig })
  })

  afterEach(() => {
    logSpy.mockRestore()
    vi.useRealTimers()
  })

  describe('register', () => {
    const buildServer = async () => {
      const server = hapi.server()
      server.decorate('server', 'logger', createLogger())
      await server.register([hapiCookie, hapiBell])
      return server
    }

    test('registers Bell with the discovered authorization endpoint and the configured client', async () => {
      const server = await buildServer()
      await server.register(authPlugin)
      server.route({
        method: 'GET',
        path: '/sign-in-with-defra-id',
        options: { auth: 'defra-id' },
        handler: () => 'signed in'
      })

      const response = await server.inject('/sign-in-with-defra-id')

      const location = new URL(response.headers.location)
      expect(response.statusCode).toBe(302)
      expect(`${location.origin}${location.pathname}`).toBe(
        oidcConfig.authorization_endpoint
      )
      expect(Object.fromEntries(location.searchParams)).toMatchObject({
        client_id: 'test-client-id',
        redirect_uri: SIGN_IN_REDIRECT_URL,
        serviceId: 'service-123',
        p: 'policy-abc',
        response_mode: 'query'
      })
    })

    test('sets default auth to the session cookie strategy', async () => {
      const server = await buildServer()
      await server.register(authPlugin)
      server.route({ method: 'GET', path: '/private', handler: () => 'ok' })

      const response = await server.inject('/private')

      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe(
        '/auth/sign-in?redirect=%2Fprivate'
      )
    })

    test('skips Bell and the OIDC fetch in stub mode, still enforcing session auth', async () => {
      config.set('stubMode', true)
      const server = await buildServer()
      await server.register(authPlugin)
      server.route({ method: 'GET', path: '/private', handler: () => 'ok' })

      const response = await server.inject('/private')

      expect(wreckGetMock).not.toHaveBeenCalled()
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe(
        '/auth/sign-in?redirect=%2Fprivate'
      )
      expect(() =>
        server.route({
          method: 'GET',
          path: '/sign-in-with-defra-id',
          options: { auth: 'defra-id' },
          handler: () => 'signed in'
        })
      ).toThrow(/defra-id/)
    })

    test('registers no Bell strategy when OIDC discovery fails', async () => {
      vi.useFakeTimers()
      wreckGetMock.mockRejectedValue(new Error('connection refused'))
      const server = await buildServer()

      const registration = expect(server.register(authPlugin)).rejects.toThrow(
        'OIDC discovery at'
      )
      await vi.advanceTimersByTimeAsync(7000)
      await registration

      expect(() =>
        server.route({
          method: 'GET',
          path: '/sign-in-with-defra-id',
          options: { auth: 'defra-id' },
          handler: () => 'signed in'
        })
      ).toThrow(/defra-id/)
    })
  })

  describe('getBellOptions', () => {
    test('provider.token returns the token endpoint and marks when the exchange started', () => {
      const request = { app: {} }

      const token = getBellOptions(oidcConfig).provider.token(request)

      expect(token).toBe(oidcConfig.token_endpoint)
      expect(request.app.defraIdTokenExchangeStartedAt).toEqual(
        expect.any(Number)
      )
    })

    test('sets the configured SameSite on the Bell state cookie', () => {
      config.set('defraId.stateCookieSameSite', 'Strict')

      expect(getBellOptions(oidcConfig).isSameSite).toBe('Strict')
    })

    test('location stores the safe redirect and returns redirectUrl', () => {
      const stored = {}
      const request = {
        query: { redirect: '/some/path?x=1' },
        yar: { set: (key, value) => (stored[key] = value) }
      }

      const location = getBellOptions(oidcConfig).location(request)

      expect(stored).toEqual({ redirect: '/some/path?x=1' })
      expect(location).toBe(SIGN_IN_REDIRECT_URL)
    })

    test('location stores the home page when the requested redirect is unsafe', () => {
      const stored = {}
      const request = {
        query: { redirect: 'https://evil.example/path' },
        yar: { set: (key, value) => (stored[key] = value) }
      }

      getBellOptions(oidcConfig).location(request)

      expect(stored).toEqual({ redirect: '/' })
    })

    test('location stores nothing when no redirect is requested', () => {
      const stored = {}
      const request = {
        query: {},
        yar: { set: (key, value) => (stored[key] = value) }
      }

      const location = getBellOptions(oidcConfig).location(request)

      expect(stored).toEqual({})
      expect(location).toBe(SIGN_IN_REDIRECT_URL)
    })

    test('providerParams adds forceReselection for /auth/organisation', () => {
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

    test('provider.profile maps decoded JWT payload to credentials.profile', () => {
      const payload = {
        contactId: 'CRN123',
        firstName: 'Andrew',
        lastName: 'Farmer',
        currentRelationshipId: 'REL-1'
      }
      const credentials = { token: tokenExpiringIn(SECONDS_PER_HOUR, payload) }

      getBellOptions(oidcConfig).provider.profile(credentials)

      expect(credentials.profile).toMatchObject({
        ...payload,
        crn: 'CRN123',
        name: 'Andrew Farmer',
        organisationId: 'REL-1'
      })
    })
  })

  describe('getCookieOptions', () => {
    test('uses the configured auth cookie name', () => {
      expect(getCookieOptions().cookie.name).toBe(AUTH_COOKIE_NAME)
    })

    test('sets SameSite Strict on the session cookie', () => {
      expect(getCookieOptions().cookie.isSameSite).toBe('Strict')
    })

    test('redirectTo builds /auth/sign-in redirect including pathname and search', () => {
      const redirect = getCookieOptions().redirectTo({
        url: { pathname: '/origin', search: '?a=1' }
      })

      expect(redirect).toBe('/auth/sign-in?redirect=%2Forigin%3Fa%3D1')
    })

    test('redirectTo encodes the return URL query string', () => {
      const redirect = getCookieOptions().redirectTo({
        url: { pathname: '/address-book', search: '?q=France&page=2' }
      })

      expect(redirect).toBe(
        '/auth/sign-in?redirect=%2Faddress-book%3Fq%3DFrance%26page%3D2'
      )
    })

    test('redirectTo keeps sending unauthenticated requests to /auth/sign-in in stub mode', () => {
      config.set('stubMode', true)

      const redirect = getCookieOptions().redirectTo({
        url: { pathname: '/origin', search: '?a=1' }
      })

      expect(redirect).toBe('/auth/sign-in?redirect=%2Forigin%3Fa%3D1')
    })

    test('validate returns isValid:false when session does not exist in cache', async () => {
      const { request } = buildRequestWithCachedSession(null)

      const res = await getCookieOptions().validate(request, {
        sessionId: 'missing'
      })

      expect(res).toEqual({ isValid: false })
    })

    test('validate counts one session resolution for the request', async () => {
      const { request } = buildRequestWithCachedSession(null)
      request.plugins = { 'call-counts': newCallCounts() }

      await getCookieOptions().validate(request, {
        sessionId: sessionIdInCache
      })

      expect(callCountsOf(request).sessionResolutions).toBe(1)
      expect(callCountsOf(request).backendCalls).toBe(0)
    })

    test('a request with a valid session cookie resolves the session once in a counted route', async () => {
      clearCallCountTotals()
      const userSession = {
        token: unexpiredToken,
        refreshToken: 'refresh-token'
      }
      const server = hapi.server()
      server.app.cache =
        buildRequestWithCachedSession(userSession).request.server.app.cache
      await server.register([hapiCookie, callCounts, callCountsRoutes])
      server.auth.strategy('session', 'cookie', getCookieOptions())
      server.auth.default('session')
      server.route([
        {
          method: 'GET',
          path: '/sign-in',
          options: { auth: false },
          handler: (request, h) => {
            request.cookieAuth.set({ sessionId: sessionIdInCache })
            return h.response('signed in')
          }
        },
        { method: 'GET', path: '/private', handler: () => 'private' }
      ])
      const signIn = await server.inject({ method: 'GET', url: '/sign-in' })
      const cookie = signIn.headers['set-cookie'][0].split(';')[0]

      const privatePage = await server.inject({
        method: 'GET',
        url: '/private',
        headers: { cookie }
      })
      const { result } = await server.inject({
        method: 'GET',
        url: '/call-counts'
      })
      await server.stop({ timeout: 0 })

      expect(privatePage.statusCode).toBe(200)
      expect(
        result.routes.find((route) => route.path === '/private')
          .sessionResolutions
      ).toBe(1)
    })

    test('validate returns isValid:true when token verification succeeds', async () => {
      const userSession = {
        token: unexpiredToken,
        refreshToken: 'refresh-token'
      }
      const { request, sessions } = buildRequestWithCachedSession(userSession)

      const res = await getCookieOptions().validate(request, {
        sessionId: sessionIdInCache
      })

      expect(res).toEqual({ isValid: true, credentials: userSession })
      expect(wreckPostMock).not.toHaveBeenCalled()
      expect(sessions.get(sessionIdInCache)).toEqual({
        token: unexpiredToken,
        refreshToken: 'refresh-token'
      })
    })

    test('validate refreshes tokens when verification fails and refreshTokens enabled', async () => {
      const { request, sessions } = buildRequestWithCachedSession({
        token: expiredToken,
        refreshToken: 'old-refresh'
      })
      wreckPostMock.mockResolvedValue({
        payload: {
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token'
        }
      })
      const refreshed = {
        token: 'new-access-token',
        refreshToken: 'new-refresh-token'
      }

      const res = await getCookieOptions().validate(request, {
        sessionId: sessionIdInCache
      })

      expect(wreckPostMock).toHaveBeenCalledWith(
        oidcConfig.token_endpoint,
        expect.objectContaining({
          payload: expect.stringContaining('refresh_token=old-refresh')
        })
      )
      expect(sessions.get(sessionIdInCache)).toEqual(refreshed)
      expect(res).toEqual({ isValid: true, credentials: refreshed })
    })

    test('validate returns isValid:false when verification fails and refreshTokens disabled', async () => {
      config.set('defraId.refreshTokens', false)
      const { request, sessions } = buildRequestWithCachedSession({
        token: expiredToken,
        refreshToken: 'old-refresh'
      })

      const res = await getCookieOptions().validate(request, {
        sessionId: sessionIdInCache
      })

      expect(res).toEqual({ isValid: false })
      expect(wreckPostMock).not.toHaveBeenCalled()
      expect(sessions.get(sessionIdInCache)).toEqual({
        token: expiredToken,
        refreshToken: 'old-refresh'
      })
    })

    test('validate returns isValid:false when refreshTokens rejects', async () => {
      const { request, sessions } = buildRequestWithCachedSession({
        token: expiredToken,
        refreshToken: 'old-refresh'
      })
      wreckPostMock.mockRejectedValue(new Error('refresh failed'))

      const res = await getCookieOptions().validate(request, {
        sessionId: sessionIdInCache
      })

      expect(res).toEqual({ isValid: false })
      expect(sessions.get(sessionIdInCache)).toEqual({
        token: expiredToken,
        refreshToken: 'old-refresh'
      })
    })
  })
})
