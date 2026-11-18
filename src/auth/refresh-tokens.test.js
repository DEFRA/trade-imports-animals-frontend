import { vi } from 'vitest'
import { refreshTokens } from './refresh-tokens.js'
import { config } from '../config/config.js'
import { recordEmfDocuments } from '../server/common/test-helpers/emf-documents.js'
import { restoreConfigAfterEach } from '../server/common/test-helpers/restore-config-after-each.js'

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

const getTraceIdMock = vi.hoisted(() => vi.fn())
vi.mock('@defra/hapi-tracing', () => ({
  getTraceId: getTraceIdMock
}))

vi.mock('../server/common/helpers/logging/logger.js', () => ({
  createLogger: () => ({
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn()
  })
}))

const DEFRA_ID_CONFIG = {
  'defraId.clientId': 'client-id',
  'defraId.clientSecret': 'client-secret',
  'defraId.redirectUrl': 'http://localhost/callback'
}

describe('refreshTokens', () => {
  const tokenEndpoint = 'https://mock-auth-server/oauth/token'
  const traceId = 'test-trace-id'
  const tokenRefresh = { dependency: 'defra-id', operation: 'token-refresh' }

  const emf = recordEmfDocuments()
  restoreConfigAfterEach(Object.keys(DEFRA_ID_CONFIG))
  let tracingHeader

  beforeEach(() => {
    wreckPostMock.mockReset()
    getOidcConfigMock.mockReset()
    getTraceIdMock.mockReset()
    getTraceIdMock.mockReturnValue(traceId)
    getOidcConfigMock.mockResolvedValue({ token_endpoint: tokenEndpoint })
    for (const [key, value] of Object.entries(DEFRA_ID_CONFIG)) {
      config.set(key, value)
    }
    tracingHeader = config.get('tracing.header')
  })

  test('measures the refresh as defra-id token-refresh', async () => {
    wreckPostMock.mockResolvedValue({ payload: {} })

    await refreshTokens('rt')

    expect(await emf.onlyExternalCall()).toEqual({
      ...tokenRefresh,
      failure: 0
    })
  })

  test('posts refresh token to token endpoint and returns payload', async () => {
    const refreshToken = 'REFRESH_TOKEN_123'
    const payload = {
      access_token: 'NEW_ACCESS',
      refresh_token: 'NEW_REFRESH'
    }

    wreckPostMock.mockResolvedValue({ payload })

    const result = await refreshTokens(refreshToken)

    expect(result).toEqual(payload)

    const expectedBody = new URLSearchParams({
      client_id: DEFRA_ID_CONFIG['defraId.clientId'],
      client_secret: DEFRA_ID_CONFIG['defraId.clientSecret'],
      grant_type: 'refresh_token',
      scope: `openid offline_access ${DEFRA_ID_CONFIG['defraId.clientId']}`,
      refresh_token: refreshToken,
      redirect_uri: DEFRA_ID_CONFIG['defraId.redirectUrl']
    }).toString()

    expect(getOidcConfigMock).toHaveBeenCalledTimes(1)
    expect(wreckPostMock).toHaveBeenCalledTimes(1)
    expect(wreckPostMock).toHaveBeenCalledWith(tokenEndpoint, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        [tracingHeader]: traceId
      },
      payload: expectedBody,
      json: true,
      timeout: 3000
    })
  })

  test('sends an empty tracing header when the request has no trace id', async () => {
    getTraceIdMock.mockReturnValue(undefined)
    wreckPostMock.mockResolvedValue({ payload: {} })

    await refreshTokens('rt')

    expect(wreckPostMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ [tracingHeader]: '' })
      })
    )
  })

  test('propagates errors from Wreck.post', async () => {
    wreckPostMock.mockRejectedValue(new Error('post failed'))

    await expect(refreshTokens('rt')).rejects.toThrow('post failed')

    expect(await emf.onlyExternalCall()).toEqual({
      ...tokenRefresh,
      failure: 1
    })
  })
})
