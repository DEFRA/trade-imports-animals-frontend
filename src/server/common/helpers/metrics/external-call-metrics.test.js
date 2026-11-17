import hapi from '@hapi/hapi'
import { vi } from 'vitest'
import { Metrics } from '@defra/cdp-metrics'

import {
  measureExternalCall,
  measureExternalResponse,
  recordExternalCallInBackground
} from './external-call-metrics.js'
import { callCounts } from '../call-counts/call-counts.js'
import { callCountsRoutes } from '../call-counts/call-counts-routes.js'
import { clearCallCountTotals } from '../call-counts/call-count-totals.js'
import { requestTracing } from '../request-tracing.js'
import { config } from '../../../../config/config.js'
import { readEmfDocuments } from '../../test-helpers/emf-documents.js'
import { recordEcsLogLines } from '../../test-helpers/ecs-log-lines.js'

const NAMESPACE_KEY = 'metrics.namespace'
const TEST_NAMESPACE = 'test-namespace'

const JWKS_CALL = {
  dependency: 'defra-id',
  operation: 'jwks',
  interfaceId: 'SYN-12'
}
const LIST_ADDRESSES = {
  dependency: 'address-book',
  operation: 'list-addresses'
}

const externalCallLines = (lines) =>
  lines.filter((line) => line.event?.category === 'external-call')

describe('external call metrics', () => {
  const originalNamespace = config.get(NAMESPACE_KEY)
  const ecsLog = recordEcsLogLines()
  let logSpy

  const onlyDocument = async () => {
    await vi.waitFor(() => expect(readEmfDocuments(logSpy)).toHaveLength(1))
    return readEmfDocuments(logSpy)[0]
  }

  beforeEach(() => {
    config.set(NAMESPACE_KEY, TEST_NAMESPACE)
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    config.set(NAMESPACE_KEY, originalNamespace)
    logSpy.mockRestore()
  })

  test('a successful call returns its result and publishes its duration and a failure of 0, tagged dependency and operation', async () => {
    const result = await measureExternalCall(JWKS_CALL, async () => 'keys')

    expect(result).toBe('keys')
    const document = await onlyDocument()
    const directive = document._aws.CloudWatchMetrics[0]
    expect(directive.Namespace).toBe(TEST_NAMESPACE)
    expect(directive.Dimensions).toEqual([['dependency', 'operation']])
    expect(directive.Metrics).toEqual([
      { Name: 'external.call.duration', Unit: 'Milliseconds' },
      { Name: 'external.call.failure', Unit: 'Count' }
    ])
    expect(document).toEqual(
      expect.objectContaining({
        dependency: 'defra-id',
        operation: 'jwks',
        'external.call.duration': expect.any(Number),
        'external.call.failure': 0
      })
    )
    expect(document).not.toHaveProperty('Interface')
    expect(document).not.toHaveProperty('LogGroup')
    expect(document).not.toHaveProperty('ServiceName')
  })

  test('a successful call writes one info line with the nested event fields and an integral duration in nanoseconds', async () => {
    await measureExternalCall(JWKS_CALL, async () => 'keys')

    const [line, ...others] = externalCallLines(ecsLog.lines())
    expect(others).toEqual([])
    expect(line['log.level']).toBe('info')
    expect(line.event).toEqual({
      category: 'external-call',
      action: 'defra-id/jwks',
      outcome: 'success',
      duration: expect.any(Number)
    })
    expect(Number.isInteger(line.event.duration)).toBe(true)
    expect(line.message).toMatch(
      /^External call defra-id\/jwks \(SYN-12\) success in \d+ ms$/
    )
    expect(line).not.toHaveProperty('error')
    expect(Object.keys(line)).not.toContain('event.category')
  })

  test('a call that throws rethrows the same error, publishes a failure of 1 and writes a warn line with the error type and message and no stack trace', async () => {
    const failure = new TypeError('fetch failed', {
      cause: Object.assign(new Error('refused'), { code: 'ECONNREFUSED' })
    })

    await expect(
      measureExternalCall(JWKS_CALL, async () => {
        throw failure
      })
    ).rejects.toBe(failure)

    expect((await onlyDocument())['external.call.failure']).toBe(1)
    const [line] = externalCallLines(ecsLog.lines())
    expect(line['log.level']).toBe('warn')
    expect(line.event.outcome).toBe('failure')
    expect(line.error).toEqual({
      type: 'TypeError',
      message: 'fetch failed',
      code: 'ECONNREFUSED'
    })
  })

  test('a response with a 5xx status is a failure, logged with its status code', async () => {
    const response = new Response(null, { status: 503 })

    await expect(
      measureExternalResponse(LIST_ADDRESSES, async () => response)
    ).resolves.toBe(response)

    expect((await onlyDocument())['external.call.failure']).toBe(1)
    const [line] = externalCallLines(ecsLog.lines())
    expect(line['log.level']).toBe('warn')
    expect(line.event.outcome).toBe('failure')
    expect(line.http).toEqual({ response: { status_code: 503 } })
    expect(line).not.toHaveProperty('error')
  })

  test('a response with a 4xx status is the dependency answering, so a success', async () => {
    await measureExternalResponse(
      LIST_ADDRESSES,
      async () => new Response(null, { status: 404 })
    )

    expect((await onlyDocument())['external.call.failure']).toBe(0)
    const [line] = externalCallLines(ecsLog.lines())
    expect(line.event.outcome).toBe('success')
    expect(line.http).toEqual({ response: { status_code: 404 } })
  })

  describe('in a request', () => {
    let server

    beforeEach(async () => {
      clearCallCountTotals()
      server = hapi.server()
      await server.register([requestTracing, callCounts, callCountsRoutes])
      server.route({
        method: 'GET',
        path: '/ext',
        handler: async () => {
          await measureExternalCall(JWKS_CALL, async () => 'keys')
          return 'page'
        }
      })
    })

    afterEach(async () => {
      await server.stop({ timeout: 0 })
    })

    test('the line carries the trace id of the request that made the call', async () => {
      await server.inject({
        method: 'GET',
        url: '/ext',
        headers: { [config.get('tracing.header')]: 'trace-123' }
      })

      const [line] = externalCallLines(ecsLog.lines())
      expect(line.trace).toEqual({ id: 'trace-123' })
    })

    test('the call is counted against the route that made it', async () => {
      await server.inject({ method: 'GET', url: '/ext' })
      const { result } = await server.inject({
        method: 'GET',
        url: '/call-counts'
      })

      expect(result.routes).toEqual([
        expect.objectContaining({
          path: '/ext',
          externalCalls: { 'defra-id': { jwks: 1 } }
        })
      ])
    })
  })

  test('a measured call resolves before its publish settles', async () => {
    const metricsLogger = {
      setNamespace: vi.fn(() => metricsLogger),
      putMetric: vi.fn(() => metricsLogger),
      flush: vi.fn(() => new Promise(() => {}))
    }
    const getMetricsLogger = vi
      .spyOn(Metrics.prototype, 'getMetricsLogger')
      .mockReturnValue(metricsLogger)

    const result = await measureExternalCall(JWKS_CALL, async () => 'keys')

    expect(result).toBe('keys')
    getMetricsLogger.mockRestore()
  })

  test('a call recorded in the background with a known duration publishes that duration', async () => {
    recordExternalCallInBackground(JWKS_CALL, { durationMs: 42, failed: true })

    const document = await onlyDocument()
    expect(document['external.call.duration']).toBe(42)
    expect(document['external.call.failure']).toBe(1)
  })
})
