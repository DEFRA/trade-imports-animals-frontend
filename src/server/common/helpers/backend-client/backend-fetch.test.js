import hapi from '@hapi/hapi'

import { backendFetch } from './backend-fetch.js'
import { callCounts } from '../call-counts/call-counts.js'
import { callCountsRoutes } from '../call-counts/call-counts-routes.js'
import { clearCallCountTotals } from '../call-counts/call-count-totals.js'
import { recordEmfDocuments } from '../../test-helpers/emf-documents.js'
import {
  ECS_PLATFORM_FIELDS,
  recordEcsLogLines
} from '../../test-helpers/ecs-log-lines.js'
import {
  fetchMock,
  resetMocksAndConfigAfterTests
} from '../../../app/engine/test-support.js'

const ecsLog = recordEcsLogLines()

const OPERATION = 'replace-notification'
const BACKEND_URL = 'http://backend.test/notifications/j-1'
const INIT = { method: 'PUT', headers: { 'content-type': 'application/json' } }

const fetchFailedBecause = (cause) => new TypeError('fetch failed', { cause })
const errorWithCode = (code) => Object.assign(new Error(code), { code })
const connectTimedOut = () =>
  fetchFailedBecause(errorWithCode('UND_ERR_CONNECT_TIMEOUT'))
const everyAddressTimedOut = () =>
  fetchFailedBecause(
    Object.assign(errorWithCode('UND_ERR_CONNECT_TIMEOUT'), {
      cause: Object.assign(
        new AggregateError(
          [errorWithCode('ETIMEDOUT'), errorWithCode('ETIMEDOUT')],
          ''
        ),
        { code: 'ETIMEDOUT' }
      )
    })
  )
const backendAnswered = (status = 200) => new Response(null, { status })

resetMocksAndConfigAfterTests()

beforeEach(() => {
  fetchMock.enableMocks()
})

describe('backendFetch', () => {
  let server

  const readRoute = async (path) => {
    const { result } = await server.inject({
      method: 'GET',
      url: '/call-counts'
    })
    return result.routes.find((route) => route.path === path)
  }

  beforeEach(async () => {
    clearCallCountTotals()
    server = hapi.server()
    await server.register([callCounts, callCountsRoutes])
  })

  afterEach(async () => {
    await server.stop({ timeout: 0 })
  })

  test("returns fetch's response and counts one backend call", async () => {
    const response = backendAnswered()
    fetchMock.mockResponseOnce(response)
    let received
    server.route({
      method: 'GET',
      path: '/page',
      handler: async () => {
        received = await backendFetch(OPERATION, BACKEND_URL, INIT)
        return 'page'
      }
    })

    await server.inject({ method: 'GET', url: '/page' })
    const { result } = await server.inject({
      method: 'GET',
      url: '/call-counts'
    })

    expect(received).toBe(response)
    expect(result.routes).toEqual([
      expect.objectContaining({ path: '/page', backendCalls: 1 })
    ])
  })

  test('still calls fetch outside a request', async () => {
    const response = backendAnswered()
    fetchMock.mockResponseOnce(response)

    await expect(backendFetch(OPERATION, BACKEND_URL, INIT)).resolves.toBe(
      response
    )
  })

  describe('when the connection to the backend does not open', () => {
    test('tries once more and returns the second response', async () => {
      const response = backendAnswered()
      fetchMock.mockRejectOnce(connectTimedOut()).mockResponseOnce(response)

      await expect(backendFetch(OPERATION, BACKEND_URL, INIT)).resolves.toBe(
        response
      )
    })

    test('logs one warning with the failed connection and the operation in its message, and no other field', async () => {
      fetchMock.mockRejectOnce(connectTimedOut())

      await backendFetch(OPERATION, BACKEND_URL, INIT)

      expect(ecsLog.linesBesideExternalCalls()).toEqual([
        {
          ...ECS_PLATFORM_FIELDS,
          'log.level': 'warn',
          message:
            'Backend connection for replace-notification did not open, retrying once',
          error: {
            type: 'TypeError',
            message: 'fetch failed',
            code: 'UND_ERR_CONNECT_TIMEOUT',
            stack_trace: expect.stringMatching(/^TypeError: fetch failed/)
          }
        }
      ])
    })

    test('tries once more when every address of the host timed out', async () => {
      const response = backendAnswered()
      fetchMock
        .mockRejectOnce(everyAddressTimedOut())
        .mockResponseOnce(response)

      await expect(backendFetch(OPERATION, BACKEND_URL, INIT)).resolves.toBe(
        response
      )
    })

    test('throws the second failure when the retry cannot connect either', async () => {
      const second = fetchFailedBecause(errorWithCode('ECONNREFUSED'))
      fetchMock.mockRejectOnce(connectTimedOut()).mockRejectOnce(second)

      await expect(backendFetch(OPERATION, BACKEND_URL, INIT)).rejects.toBe(
        second
      )
    })

    test('counts the call once, however many attempts it took', async () => {
      fetchMock.mockRejectOnce(connectTimedOut())
      server.route({
        method: 'GET',
        path: '/stalled',
        handler: async () => {
          await backendFetch(OPERATION, BACKEND_URL, INIT)
          return 'page'
        }
      })

      await server.inject({ method: 'GET', url: '/stalled' })

      expect((await readRoute('/stalled')).backendCalls).toBe(1)
    })
  })

  test('counts every backend call a request makes', async () => {
    server.route({
      method: 'GET',
      path: '/two',
      handler: async () => {
        await backendFetch(OPERATION, BACKEND_URL, INIT)
        await backendFetch(OPERATION, BACKEND_URL, INIT)
        return 'page'
      }
    })

    await server.inject({ method: 'GET', url: '/two' })

    expect((await readRoute('/two')).backendCalls).toBe(2)
  })

  test('counts a backend call whose fetch rejects', async () => {
    const down = new Error('down')
    fetchMock.mockRejectOnce(down)
    let rejection
    server.route({
      method: 'GET',
      path: '/failing',
      handler: async () => {
        rejection = await backendFetch(OPERATION, BACKEND_URL, INIT).catch(
          (error) => error
        )
        return 'page'
      }
    })

    await server.inject({ method: 'GET', url: '/failing' })

    expect(rejection).toBe(down)
    expect((await readRoute('/failing')).backendCalls).toBe(1)
  })

  test('keeps the counts of overlapping requests apart', async () => {
    let releaseA
    let releaseB
    const gateA = new Promise((resolve) => {
      releaseA = resolve
    })
    const gateB = new Promise((resolve) => {
      releaseB = resolve
    })
    const callBackendInterleaved = async (times) => {
      for (let call = 0; call < times; call++) {
        await backendFetch(OPERATION, BACKEND_URL, INIT)
        await Promise.resolve()
      }
    }
    server.route([
      {
        method: 'GET',
        path: '/a',
        handler: async () => {
          await gateA
          await callBackendInterleaved(2)
          return 'a'
        }
      },
      {
        method: 'GET',
        path: '/b',
        handler: async () => {
          await gateB
          await callBackendInterleaved(3)
          return 'b'
        }
      }
    ])

    const requests = Promise.all([
      server.inject({ method: 'GET', url: '/a' }),
      server.inject({ method: 'GET', url: '/b' })
    ])
    releaseA()
    releaseB()
    await requests

    expect(await readRoute('/a')).toEqual(
      expect.objectContaining({ backendCalls: 2, pageRequests: 1 })
    )
    expect(await readRoute('/b')).toEqual(
      expect.objectContaining({ backendCalls: 3, pageRequests: 1 })
    )
  })
})

describe('backendFetch records one external call', () => {
  const emf = recordEmfDocuments()
  const animalsBackendCall = {
    dependency: 'animals-backend',
    operation: OPERATION
  }

  test('is one animals-backend call under the operation named', async () => {
    await backendFetch(OPERATION, BACKEND_URL, INIT)

    expect(await emf.onlyExternalCall()).toEqual({
      ...animalsBackendCall,
      failure: 0
    })
  })

  test('is one call timed from the first attempt when the connection is retried', async () => {
    const firstAttemptMs = 40
    fetchMock.mockResponseOnce(
      () =>
        new Promise((_resolve, reject) =>
          setTimeout(() => reject(connectTimedOut()), firstAttemptMs)
        )
    )

    await backendFetch(OPERATION, BACKEND_URL, INIT)

    await emf.onlyExternalCall()
    const [durationMs] = emf.valuesOf('external.call.duration')
    expect(durationMs).toBeGreaterThanOrEqual(firstAttemptMs - 5)
  })

  test('is a failure when the backend answers with a 5xx status', async () => {
    fetchMock.mockResponseOnce(backendAnswered(502))

    await backendFetch(OPERATION, BACKEND_URL, INIT)

    expect(await emf.onlyExternalCall()).toEqual({
      ...animalsBackendCall,
      failure: 1
    })
  })

  test('is a success when the backend refuses a stale write with 409', async () => {
    fetchMock.mockResponseOnce(backendAnswered(409))

    await backendFetch(OPERATION, BACKEND_URL, INIT)

    expect(await emf.onlyExternalCall()).toEqual({
      ...animalsBackendCall,
      failure: 0
    })
  })
})

describe('backendFetch on a socket failure', () => {
  test.each(['UND_ERR_SOCKET', 'ETIMEDOUT'])(
    'throws a %s socket failure without sending the request again',
    async (code) => {
      const socketFailed = fetchFailedBecause(errorWithCode(code))
      fetchMock.mockRejectOnce(socketFailed)

      await expect(backendFetch(OPERATION, BACKEND_URL, INIT)).rejects.toBe(
        socketFailed
      )
      expect({
        lines: ecsLog.linesBesideExternalCalls(),
        fetches: fetchMock.mock.calls
      }).toEqual({
        lines: [],
        fetches: [expect.anything()]
      })
    }
  )
})
