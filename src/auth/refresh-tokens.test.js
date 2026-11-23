import { vi } from 'vitest'
import { refreshTokens } from './refresh-tokens.js'
import { config } from '../config/config.js'
import {
  defraIdDiscoveryCall,
  useDefraIdNetwork
} from '../server/common/test-helpers/defra-id-network.js'
import { recordEcsLogLines } from '../server/common/test-helpers/ecs-log-lines.js'
import { recordEmfDocuments } from '../server/common/test-helpers/emf-documents.js'
import { restoreConfigAfterEach } from '../server/common/test-helpers/restore-config-after-each.js'

const getTraceIdMock = vi.hoisted(() => vi.fn())
vi.mock('@defra/hapi-tracing', () => ({
  getTraceId: getTraceIdMock
}))

const DEFRA_ID_CONFIG = {
  'defraId.clientId': 'client-id',
  'defraId.clientSecret': 'client-secret',
  'defraId.redirectUrl': 'http://localhost/callback'
}

describe('refreshTokens', () => {
  const traceId = 'test-trace-id'
  const refreshToken = 'REFRESH_TOKEN_123'
  const refreshedTokens = {
    access_token: 'NEW_ACCESS',
    refresh_token: 'NEW_REFRESH'
  }
  const refreshForm = {
    client_id: DEFRA_ID_CONFIG['defraId.clientId'],
    client_secret: DEFRA_ID_CONFIG['defraId.clientSecret'],
    grant_type: 'refresh_token',
    scope: `openid offline_access ${DEFRA_ID_CONFIG['defraId.clientId']}`,
    refresh_token: refreshToken,
    redirect_uri: DEFRA_ID_CONFIG['defraId.redirectUrl']
  }
  const discoveryCall = { ...defraIdDiscoveryCall, failure: 0 }
  const tokenRefresh = { dependency: 'defra-id', operation: 'token-refresh' }

  const { defraId, serveDiscovery } = useDefraIdNetwork()
  restoreConfigAfterEach(Object.keys(DEFRA_ID_CONFIG))
  const emf = recordEmfDocuments()
  const ecsLog = recordEcsLogLines()
  let tracingHeader

  const interceptRefresh = () => defraId().post('/idp/token', refreshForm)

  const refreshLine = () => ecsLog.externalCallLine('defra-id/token-refresh')

  beforeEach(() => {
    for (const [key, value] of Object.entries(DEFRA_ID_CONFIG)) {
      config.set(key, value)
    }
    tracingHeader = config.get('tracing.header')
    getTraceIdMock.mockReset()
    getTraceIdMock.mockReturnValue(traceId)
    serveDiscovery()
  })

  test('posts the refresh token form with the trace id to the discovered token endpoint, returns the new tokens, and records a successful defra-id token-refresh call logged as SYN-13', async () => {
    interceptRefresh()
      .matchHeader('content-type', 'application/x-www-form-urlencoded')
      .matchHeader(tracingHeader, traceId)
      .reply(200, refreshedTokens)

    const result = await refreshTokens(refreshToken)

    expect(result).toEqual(refreshedTokens)
    await vi.waitFor(() =>
      expect(emf.externalCalls()).toEqual([
        discoveryCall,
        { ...tokenRefresh, failure: 0 }
      ])
    )
    expect(refreshLine()['log.level']).toBe('info')
    expect(refreshLine().message).toMatch(
      /^External call defra-id\/token-refresh \(SYN-13\) success in \d+ ms$/
    )
  })

  test('sends an empty tracing header when the request has no trace id', async () => {
    getTraceIdMock.mockReturnValue(undefined)
    interceptRefresh()
      .matchHeader(tracingHeader, '')
      .reply(200, refreshedTokens)

    await expect(refreshTokens(refreshToken)).resolves.toEqual(refreshedTokens)
  })

  test('gives up on a refresh Defra ID has not answered within three seconds', async () => {
    interceptRefresh().delay(3100).reply(200, refreshedTokens)

    await expect(refreshTokens(refreshToken)).rejects.toThrow(
      'Client request timeout'
    )
  })

  test('rethrows a refresh Defra ID refuses with 400, and records it as an answered defra-id token-refresh call logged with that status', async () => {
    interceptRefresh().reply(400, { error: 'invalid_grant' })

    await expect(refreshTokens(refreshToken)).rejects.toThrow('Bad Request')

    await vi.waitFor(() =>
      expect(emf.externalCalls()).toEqual([
        discoveryCall,
        { ...tokenRefresh, failure: 0 }
      ])
    )
    expect(refreshLine()['log.level']).toBe('info')
    expect(refreshLine().http).toEqual({ response: { status_code: 400 } })
  })

  test('rethrows a refresh Defra ID answers with 503, and records it as a failed defra-id token-refresh call logged as SYN-13', async () => {
    interceptRefresh().reply(503)

    await expect(refreshTokens(refreshToken)).rejects.toThrow(
      'Service Unavailable'
    )

    await vi.waitFor(() =>
      expect(emf.externalCalls()).toEqual([
        discoveryCall,
        { ...tokenRefresh, failure: 1 }
      ])
    )
    expect(refreshLine()['log.level']).toBe('warn')
    expect(refreshLine().http).toEqual({ response: { status_code: 503 } })
    expect(refreshLine().message).toMatch(
      /^External call defra-id\/token-refresh \(SYN-13\) failure in \d+ ms$/
    )
  })
})
