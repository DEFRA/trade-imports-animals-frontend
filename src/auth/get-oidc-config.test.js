import { vi } from 'vitest'
import { config } from '../config/config.js'
import { getOidcConfig } from './get-oidc-config.js'
import { readEmfDocuments } from '../server/common/test-helpers/emf-documents.js'
import { restoreConfigAfterEach } from '../server/common/test-helpers/restore-config-after-each.js'
import {
  setStackDefraIdRewrite,
  STACK_DEFRA_ID_REWRITE_KEYS
} from '../server/common/test-helpers/stack-defra-id-rewrite.js'

const wreckGetMock = vi.hoisted(() => vi.fn())
const getTraceIdMock = vi.hoisted(() => vi.fn())

vi.mock('@hapi/wreck', () => ({
  default: { get: wreckGetMock }
}))

vi.mock('@defra/hapi-tracing', () => ({
  getTraceId: getTraceIdMock
}))

describe('getOidcConfig', () => {
  const discoveryUrl = 'https://localhost/idp/.well-known/openid-configuration'
  const traceId = 'test-trace-id'

  restoreConfigAfterEach([
    'defraId.oidcDiscoveryUrl',
    ...STACK_DEFRA_ID_REWRITE_KEYS
  ])

  let logSpy
  let tracingHeader

  beforeEach(() => {
    wreckGetMock.mockReset()
    getTraceIdMock.mockReset()
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    setStackDefraIdRewrite()
    config.set('defraId.oidcDiscoveryUrl', discoveryUrl)
    tracingHeader = config.get('tracing.header')
    getTraceIdMock.mockReturnValue(traceId)
  })

  afterEach(() => {
    logSpy.mockRestore()
  })

  test('measures the discovery call as defra-id openid-configuration', async () => {
    wreckGetMock.mockResolvedValue({ payload: {} })

    await getOidcConfig()

    await vi.waitFor(() => expect(readEmfDocuments(logSpy)).toHaveLength(1))
    const [document] = readEmfDocuments(logSpy)
    expect(document.Dependency).toBe('defra-id')
    expect(document.Operation).toBe('openid-configuration')
    expect(document.ExternalCallFailure).toBe(0)
    expect(document.Outcome).toBe('success')
    expect(document).not.toHaveProperty('Interface')
  })

  test('fetches discovery document with tracing header', async () => {
    const payload = {
      authorization_endpoint: 'https://localhost/auth'
    }

    wreckGetMock.mockResolvedValue({ payload })

    const result = await getOidcConfig()

    expect(result).toEqual(payload)
    expect(wreckGetMock).toHaveBeenCalledWith(discoveryUrl, {
      headers: { [tracingHeader]: traceId },
      json: true,
      timeout: 1000
    })
  })

  test('sends an empty tracing header when the request has no trace id', async () => {
    getTraceIdMock.mockReturnValue(undefined)
    wreckGetMock.mockResolvedValue({ payload: {} })

    await getOidcConfig()

    expect(wreckGetMock).toHaveBeenCalledWith(
      discoveryUrl,
      expect.objectContaining({ headers: { [tracingHeader]: '' } })
    )
  })

  test('rewrites token_endpoint and jwks_uri hostnames to discovery URL hostname', async () => {
    wreckGetMock.mockResolvedValue({
      payload: {
        authorization_endpoint: 'https://external-host/auth',
        token_endpoint: 'https://internal-host:9443/token',
        jwks_uri: 'https://internal-host:9443/jwks'
      }
    })

    const result = await getOidcConfig()

    expect(result).toEqual({
      authorization_endpoint: 'https://external-host/auth',
      token_endpoint: 'https://localhost:9443/token',
      jwks_uri: 'https://localhost:9443/jwks'
    })
  })

  test('propagates Wreck errors', async () => {
    wreckGetMock.mockRejectedValue(new Error('discovery failed'))

    await expect(getOidcConfig()).rejects.toThrow('discovery failed')
    await vi.waitFor(() => expect(readEmfDocuments(logSpy)).toHaveLength(1))
    const [document] = readEmfDocuments(logSpy)
    expect(document.ExternalCallFailure).toBe(1)
    expect(document.Outcome).toBe('failure')
  })
})
