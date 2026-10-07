import hapi from '@hapi/hapi'
import { vi } from 'vitest'
import { Metrics } from '@defra/cdp-metrics'

import {
  measureExternalCall,
  recordExternalCall,
  recordExternalCallInBackground
} from './external-call-metrics.js'
import { callCounts } from './call-counts/call-counts.js'
import { callCountsRoutes } from './call-counts/call-counts-routes.js'
import { clearCallCountTotals } from './call-counts/call-count-totals.js'
import { config } from '../../../config/config.js'
import { readEmfDocuments } from '../test-helpers/emf-documents.js'

const loggerWarnMock = vi.hoisted(() => vi.fn())

vi.mock('./logging/logger.js', () => ({
  createLogger: () => ({
    warn: loggerWarnMock,
    info: vi.fn(),
    error: vi.fn()
  })
}))

const NAMESPACE_KEY = 'metrics.namespace'
const TEST_NAMESPACE = 'test-namespace'

const JWKS_CALL = {
  dependency: 'defra-id',
  operation: 'jwks',
  interfaceId: 'SYN-12'
}

describe('external call metrics', () => {
  const originalNamespace = config.get(NAMESPACE_KEY)
  let logSpy

  beforeEach(() => {
    config.set(NAMESPACE_KEY, TEST_NAMESPACE)
    loggerWarnMock.mockReset()
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    config.set(NAMESPACE_KEY, originalNamespace)
    vi.restoreAllMocks()
  })

  test('measureExternalCall returns the result and emits one success document', async () => {
    const result = await measureExternalCall(JWKS_CALL, async () => 'keys')

    expect(result).toBe('keys')
    await vi.waitFor(() => expect(readEmfDocuments(logSpy)).toHaveLength(1))
    const [document] = readEmfDocuments(logSpy)
    const directive = document._aws.CloudWatchMetrics[0]
    expect(directive.Namespace).toBe(TEST_NAMESPACE)
    expect(directive.Dimensions).toEqual([['Dependency', 'Operation']])
    expect(directive.Metrics).toEqual([
      expect.objectContaining({
        Name: 'ExternalCallDuration',
        Unit: 'Milliseconds'
      }),
      expect.objectContaining({ Name: 'ExternalCallFailure', Unit: 'Count' })
    ])
    expect(document.Dependency).toBe('defra-id')
    expect(document.Operation).toBe('jwks')
    expect(document.ExternalCallDuration).toBeGreaterThanOrEqual(0)
    expect(document.ExternalCallFailure).toBe(0)
    expect(document.Outcome).toBe('success')
    expect(document.Interface).toBe('SYN-12')
    expect(document).not.toHaveProperty('LogGroup')
    expect(document).not.toHaveProperty('ServiceName')
    expect(document).not.toHaveProperty('ServiceType')
  })

  test('recording a call in the background counts it against the route that made it', async () => {
    clearCallCountTotals()
    const server = hapi.server()
    await server.register([callCounts, callCountsRoutes])
    server.route({
      method: 'GET',
      path: '/ext',
      handler: () => {
        recordExternalCallInBackground(JWKS_CALL, {
          durationMs: 5,
          failed: false
        })
        return 'page'
      }
    })

    await server.inject({ method: 'GET', url: '/ext' })
    const { result } = await server.inject({
      method: 'GET',
      url: '/call-counts'
    })
    await server.stop({ timeout: 0 })

    expect(result.routes).toEqual([
      expect.objectContaining({
        path: '/ext',
        externalCalls: { 'defra-id': { jwks: 1 } }
      })
    ])
  })

  test('measureExternalCall rethrows the same error and emits a failure document', async () => {
    const failure = new Error('jwks unavailable')

    await expect(
      measureExternalCall(JWKS_CALL, async () => {
        throw failure
      })
    ).rejects.toBe(failure)

    await vi.waitFor(() => expect(readEmfDocuments(logSpy)).toHaveLength(1))
    const [document] = readEmfDocuments(logSpy)
    expect(document.ExternalCallFailure).toBe(1)
    expect(document.Outcome).toBe('failure')
  })

  test('a call with no interfaceId emits no Interface', async () => {
    await measureExternalCall(
      { dependency: 'defra-id', operation: 'openid-configuration' },
      async () => 'document'
    )

    await vi.waitFor(() => expect(readEmfDocuments(logSpy)).toHaveLength(1))
    expect(readEmfDocuments(logSpy)[0]).not.toHaveProperty('Interface')
  })

  test('measureExternalCall resolves before the flush settles', async () => {
    const metricsLogger = {
      setNamespace: vi.fn(() => metricsLogger),
      putMetric: vi.fn(() => metricsLogger),
      setProperty: vi.fn(() => metricsLogger),
      flush: vi.fn(() => new Promise(() => {}))
    }
    vi.spyOn(Metrics.prototype, 'getMetricsLogger').mockReturnValue(
      metricsLogger
    )

    const result = await measureExternalCall(JWKS_CALL, async () => 'keys')

    expect(result).toBe('keys')
    expect(metricsLogger.flush).toHaveBeenCalledTimes(1)
  })

  test('recordExternalCall resolves and logs a warning when the flush rejects', async () => {
    const metricsLogger = {
      setNamespace: vi.fn(() => metricsLogger),
      putMetric: vi.fn(() => metricsLogger),
      setProperty: vi.fn(() => metricsLogger),
      flush: vi.fn().mockRejectedValue(new Error('agent unavailable'))
    }
    vi.spyOn(Metrics.prototype, 'getMetricsLogger').mockReturnValue(
      metricsLogger
    )

    await expect(
      recordExternalCall(JWKS_CALL, { durationMs: 5, failed: false })
    ).resolves.toBeUndefined()

    expect(loggerWarnMock).toHaveBeenCalledWith(
      expect.objectContaining({ dependency: 'defra-id', operation: 'jwks' }),
      'Could not record external call'
    )
  })
})
