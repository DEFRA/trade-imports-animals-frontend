import hapi from '@hapi/hapi'
import Wreck from '@hapi/wreck'
import { onTestFinished, vi } from 'vitest'
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
import { RefusedCallError } from '../../../app/services/http/dependency-error.js'
import { config } from '../../../../config/config.js'
import {
  EMF_TEST_NAMESPACE,
  recordEmfDocuments
} from '../../test-helpers/emf-documents.js'
import { recordEcsLogLines } from '../../test-helpers/ecs-log-lines.js'

const JWKS_CALL = {
  dependency: 'defra-id',
  operation: 'jwks',
  interfaceId: 'SYN-12'
}
const LIST_ADDRESSES = {
  dependency: 'address-book',
  operation: 'list-addresses'
}

describe('external call metrics', () => {
  const ecsLog = recordEcsLogLines()
  const emf = recordEmfDocuments()

  test('a successful call returns its result and publishes its duration and a failure of 0, tagged dependency and operation', async () => {
    const result = await measureExternalCall(JWKS_CALL, async () => 'keys')

    expect(result).toBe('keys')
    const document = await emf.onlyDocument()
    const directive = document._aws.CloudWatchMetrics[0]
    expect(directive.Namespace).toBe(EMF_TEST_NAMESPACE)
    expect(directive.Dimensions).toEqual([['dependency', 'operation']])
    expect(directive.Metrics).toEqual([
      { Name: 'external.call.duration', Unit: 'Milliseconds' },
      { Name: 'external.call.failure', Unit: 'Count' }
    ])
    const { _aws, ...values } = document
    expect(values).toEqual({
      dependency: 'defra-id',
      operation: 'jwks',
      'external.call.duration': expect.any(Number),
      'external.call.failure': 0
    })
  })

  test('a successful call taking 41.6 ms writes one info line with the nested event fields, a duration of 41,600,000 ns and 42 ms in the message, and publishes 41.6 ms', async () => {
    const now = vi
      .spyOn(performance, 'now')
      .mockReturnValueOnce(1000)
      .mockReturnValueOnce(1041.6)
    onTestFinished(() => now.mockRestore())

    await measureExternalCall(JWKS_CALL, async () => 'keys')

    const line = ecsLog.onlyExternalCallLine()
    expect(line['log.level']).toBe('info')
    expect(line.event).toEqual({
      category: 'external-call',
      action: 'defra-id/jwks',
      outcome: 'success',
      duration: 41_600_000
    })
    expect(line.message).toBe(
      'External call defra-id/jwks (SYN-12) success in 42 ms'
    )
    expect((await emf.onlyDocument())['external.call.duration']).toBeCloseTo(
      41.6
    )
    expect(line).not.toHaveProperty('error')
  })

  test('a call that throws rethrows the same error, publishes a failure of 1 and writes a warn line with the error type, message, its cause code and a stack trace that carries its cause', async () => {
    const failure = new TypeError('fetch failed', {
      cause: Object.assign(new Error('refused'), { code: 'ECONNREFUSED' })
    })

    await expect(
      measureExternalCall(JWKS_CALL, async () => {
        throw failure
      })
    ).rejects.toBe(failure)

    expect((await emf.onlyDocument())['external.call.failure']).toBe(1)
    const line = ecsLog.onlyExternalCallLine()
    expect(line['log.level']).toBe('warn')
    expect(line.event.outcome).toBe('failure')
    expect(line.error).toEqual({
      type: 'TypeError',
      message: 'fetch failed',
      code: 'ECONNREFUSED',
      stack_trace: expect.stringMatching(
        /^TypeError: fetch failed\n[\s\S]*\ncaused by: Error: refused\n/
      )
    })
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

      expect(ecsLog.onlyExternalCallLine().trace).toEqual({ id: 'trace-123' })
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
    onTestFinished(() => getMetricsLogger.mockRestore())

    const result = await measureExternalCall(JWKS_CALL, async () => 'keys')

    expect(result).toBe('keys')
  })

  test('a failed call recorded in the background publishes the duration given and a failure of 1', async () => {
    recordExternalCallInBackground(JWKS_CALL, { durationMs: 42, failed: true })

    const document = await emf.onlyDocument()
    expect(document['external.call.duration']).toBe(42)
    expect(document['external.call.failure']).toBe(1)
  })
})

describe('the status a dependency answers with', () => {
  const ecsLog = recordEcsLogLines()
  const emf = recordEmfDocuments()

  test.each([
    { status: 404, outcome: 'success', failure: 0, level: 'info' },
    { status: 499, outcome: 'success', failure: 0, level: 'info' },
    { status: 500, outcome: 'failure', failure: 1, level: 'warn' },
    { status: 503, outcome: 'failure', failure: 1, level: 'warn' }
  ])(
    'a response with status $status is returned, is a $outcome and is logged with its status code and no error',
    async ({ status, outcome, failure, level }) => {
      const response = new Response(null, { status })

      await expect(
        measureExternalResponse(LIST_ADDRESSES, async () => response)
      ).resolves.toBe(response)

      expect((await emf.onlyDocument())['external.call.failure']).toBe(failure)
      const line = ecsLog.onlyExternalCallLine()
      expect(line['log.level']).toBe(level)
      expect(line.event.outcome).toBe(outcome)
      expect(line.http).toEqual({ response: { status_code: status } })
      expect(line).not.toHaveProperty('error')
    }
  )

  test.each([
    {
      status: 404,
      outcome: 'success',
      failure: 0,
      level: 'info',
      errorLogged: 'no error'
    },
    {
      status: 503,
      outcome: 'failure',
      failure: 1,
      level: 'warn',
      errorLogged: 'the error type, message and stack trace',
      error: {
        type: 'RefusedCallError',
        message: 'address-book refused to list addresses: 503 Refused',
        stack_trace: expect.stringMatching(
          /^RefusedCallError: address-book refused to list addresses: 503 Refused\n/
        )
      }
    }
  ])(
    'a call that throws an error with status $status rethrows it, is a $outcome and is logged with its status code and $errorLogged',
    async ({ status, outcome, failure, level, error }) => {
      const refusal = new RefusedCallError(
        LIST_ADDRESSES,
        new Response(null, { status, statusText: 'Refused' })
      )

      await expect(
        measureExternalCall(LIST_ADDRESSES, async () => {
          throw refusal
        })
      ).rejects.toBe(refusal)

      expect((await emf.onlyDocument())['external.call.failure']).toBe(failure)
      const line = ecsLog.onlyExternalCallLine()
      expect(line['log.level']).toBe(level)
      expect(line.event.outcome).toBe(outcome)
      expect(line.http).toEqual({ response: { status_code: status } })
      expect(line.error).toEqual(error)
    }
  )

  describe('through Wreck', () => {
    let dependency

    const wreckGet = (path, options) =>
      Wreck.get(`${dependency.info.uri}${path}`, options)

    beforeEach(async () => {
      dependency = hapi.server({ host: 'localhost', port: 0 })
      dependency.route([
        {
          method: 'GET',
          path: '/status/{status}',
          handler: (request, h) =>
            h.response().code(Number(request.params.status))
        },
        {
          method: 'GET',
          path: '/slow',
          handler: () =>
            new Promise((resolve) => setTimeout(() => resolve('late'), 200))
        }
      ])
      await dependency.start()
    })

    afterEach(async () => {
      await dependency.stop({ timeout: 0 })
    })

    test.each([
      { status: 400, outcome: 'success', failure: 0 },
      { status: 502, outcome: 'failure', failure: 1 }
    ])(
      'a $status response Wreck rejects is a $outcome, logged with its status code, and still rethrown',
      async ({ status, outcome, failure }) => {
        await expect(
          measureExternalCall(JWKS_CALL, () => wreckGet(`/status/${status}`))
        ).rejects.toMatchObject({ output: { statusCode: status } })

        expect((await emf.onlyDocument())['external.call.failure']).toBe(
          failure
        )
        const line = ecsLog.onlyExternalCallLine()
        expect(line.event.outcome).toBe(outcome)
        expect(line.http).toEqual({ response: { status_code: status } })
      }
    )

    test('a Wreck timeout, with no answer from the dependency, is a failure logged with no status code', async () => {
      await expect(
        measureExternalCall(JWKS_CALL, () => wreckGet('/slow', { timeout: 10 }))
      ).rejects.toThrow('Client request timeout')

      expect((await emf.onlyDocument())['external.call.failure']).toBe(1)
      const line = ecsLog.onlyExternalCallLine()
      expect(line.event.outcome).toBe('failure')
      expect(line).not.toHaveProperty('http')
    })
  })
})
