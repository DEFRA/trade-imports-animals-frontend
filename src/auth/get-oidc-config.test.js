import { vi } from 'vitest'
import { config } from '../config/config.js'
import { getOidcConfig, OIDC_DOCUMENT_TIMEOUT_MS } from './get-oidc-config.js'
import {
  defraIdDiscoveryCall,
  defraIdDiscoveryDocument,
  useDefraIdNetwork
} from '../server/common/test-helpers/defra-id-network.js'
import { recordEcsLogLines } from '../server/common/test-helpers/ecs-log-lines.js'
import { recordEmfDocuments } from '../server/common/test-helpers/emf-documents.js'
import { restoreConfigAfterEach } from '../server/common/test-helpers/restore-config-after-each.js'
import {
  setStackDefraIdRewrite,
  STACK_DEFRA_ID_REWRITE_KEYS
} from '../server/common/test-helpers/stack-defra-id-rewrite.js'

const getTraceIdMock = vi.hoisted(() => vi.fn())

vi.mock('@defra/hapi-tracing', () => ({
  getTraceId: getTraceIdMock
}))

describe('getOidcConfig', () => {
  const traceId = 'test-trace-id'
  const { discoverAt, interceptDiscovery } = useDefraIdNetwork()
  restoreConfigAfterEach(STACK_DEFRA_ID_REWRITE_KEYS)
  const emf = recordEmfDocuments()
  const ecsLog = recordEcsLogLines()
  let tracingHeader

  beforeEach(() => {
    getTraceIdMock.mockReset()
    getTraceIdMock.mockReturnValue(traceId)
    tracingHeader = config.get('tracing.header')
  })

  test('returns the discovery document fetched with the trace id, and records a successful defra-id openid-configuration call', async () => {
    interceptDiscovery()
      .matchHeader(tracingHeader, traceId)
      .reply(200, defraIdDiscoveryDocument)

    const result = await getOidcConfig()

    expect(result).toEqual(defraIdDiscoveryDocument)
    expect(await emf.onlyExternalCall()).toEqual({
      ...defraIdDiscoveryCall,
      failure: 0
    })
    const line = ecsLog.onlyExternalCallLine()
    expect(line['log.level']).toBe('info')
    expect(line.message).toMatch(
      /^External call defra-id\/openid-configuration success in \d+ ms$/
    )
  })

  test('sends an empty tracing header when the request has no trace id', async () => {
    getTraceIdMock.mockReturnValue(undefined)
    interceptDiscovery()
      .matchHeader(tracingHeader, '')
      .reply(200, defraIdDiscoveryDocument)

    await expect(getOidcConfig()).resolves.toEqual(defraIdDiscoveryDocument)
  })

  test('rewrites token_endpoint and jwks_uri hostnames to discovery URL hostname', async () => {
    setStackDefraIdRewrite()
    discoverAt('https://localhost')
    interceptDiscovery('https://localhost').reply(200, {
      authorization_endpoint: 'https://external-host/auth',
      token_endpoint: 'https://internal-host:9443/token',
      jwks_uri: 'https://internal-host:9443/jwks'
    })

    const result = await getOidcConfig()

    expect(result).toEqual({
      authorization_endpoint: 'https://external-host/auth',
      token_endpoint: 'https://localhost:9443/token',
      jwks_uri: 'https://localhost:9443/jwks'
    })
  })

  test('rethrows a discovery fetch Defra ID answers with 503, and records it as a failed defra-id openid-configuration call with that status', async () => {
    interceptDiscovery().reply(503)

    await expect(getOidcConfig()).rejects.toThrow('Service Unavailable')

    expect(await emf.onlyExternalCall()).toEqual({
      ...defraIdDiscoveryCall,
      failure: 1
    })
    const line = ecsLog.onlyExternalCallLine()
    expect(line['log.level']).toBe('warn')
    expect(line.http).toEqual({ response: { status_code: 503 } })
    expect(line.message).toMatch(
      /^External call defra-id\/openid-configuration failure in \d+ ms$/
    )
  })

  test('gives up on a discovery fetch Defra ID has not answered within the document timeout, and records it as a failed defra-id openid-configuration call', async () => {
    interceptDiscovery()
      .delay(OIDC_DOCUMENT_TIMEOUT_MS + 100)
      .reply(200, defraIdDiscoveryDocument)

    await expect(getOidcConfig()).rejects.toThrow('Client request timeout')

    expect(await emf.onlyExternalCall()).toEqual({
      ...defraIdDiscoveryCall,
      failure: 1
    })
  })
})
