import { vi } from 'vitest'
import { refreshTokens } from './refresh-tokens.js'

const wreckPostMock = vi.hoisted(() => vi.fn())
vi.mock('@hapi/wreck', () => ({
  default: {
    post: wreckPostMock
  }
}))

const getOidcConfigMock = vi.hoisted(() => vi.fn())
vi.mock('./get-oidc-config.js', () => ({
  getOidcConfig: getOidcConfigMock
}))

const configGetMock = vi.hoisted(() => vi.fn())
vi.mock('../config/config.js', () => ({
  config: {
    get: configGetMock
  }
}))

const getTraceIdMock = vi.hoisted(() => vi.fn())
vi.mock('@defra/hapi-tracing', () => ({
  getTraceId: getTraceIdMock
}))

describe('refreshTokens', () => {
  const tracingHeader = 'x-cdp-request-id'
  const traceId = 'test-trace-id'

  beforeEach(() => {
    wreckPostMock.mockReset()
    getOidcConfigMock.mockReset()
    configGetMock.mockReset()
    getTraceIdMock.mockReset()
    getTraceIdMock.mockReturnValue(traceId)
  })

  test('posts refresh token to token endpoint and returns payload', async () => {
    const tokenEndpoint = 'https://mock-auth-server/oauth/token'
    getOidcConfigMock.mockResolvedValue({ token_endpoint: tokenEndpoint })

    const clientId = 'client-id'
    const clientSecret = 'client-secret'
    const redirectUrl = 'http://localhost/callback'

    configGetMock.mockImplementation((key) => {
      switch (key) {
        case 'defraId.clientId':
          return clientId
        case 'defraId.clientSecret':
          return clientSecret
        case 'defraId.redirectUrl':
          return redirectUrl
        case 'tracing.header':
          return tracingHeader
        default:
          return undefined
      }
    })

    const refreshToken = 'REFRESH_TOKEN_123'
    const payload = {
      access_token: 'NEW_ACCESS',
      refresh_token: 'NEW_REFRESH'
    }

    wreckPostMock.mockResolvedValue({ payload })

    const result = await refreshTokens(refreshToken)

    expect(result).toEqual(payload)

    const expectedQuery = [
      `client_id=${clientId}`,
      `client_secret=${clientSecret}`,
      'grant_type=refresh_token',
      `scope=openid offline_access ${clientId}`,
      `refresh_token=${refreshToken}`,
      `redirect_uri=${redirectUrl}`
    ].join('&')

    expect(getOidcConfigMock).toHaveBeenCalledTimes(1)
    expect(wreckPostMock).toHaveBeenCalledTimes(1)
    expect(wreckPostMock).toHaveBeenCalledWith(
      `${tokenEndpoint}?${expectedQuery}`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          [tracingHeader]: traceId
        },
        json: true
      }
    )
  })

  test('propagates errors from Wreck.post', async () => {
    const tokenEndpoint = 'https://mock-auth-server/oauth/token'
    getOidcConfigMock.mockResolvedValue({ token_endpoint: tokenEndpoint })

    configGetMock.mockImplementation((key) => {
      if (key === 'defraId.clientId') return 'client-id'
      if (key === 'defraId.clientSecret') return 'client-secret'
      if (key === 'defraId.redirectUrl') return 'http://localhost/callback'
      if (key === 'tracing.header') return tracingHeader
      return undefined
    })

    wreckPostMock.mockRejectedValue(new Error('post failed'))

    await expect(refreshTokens('rt')).rejects.toThrow('post failed')
  })
})
