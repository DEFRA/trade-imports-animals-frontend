import { vi } from 'vitest'
import { getOidcConfigWithRetry } from './get-oidc-config-with-retry.js'
import { config } from '../config/config.js'
import { defraIdDiscoveryCall } from '../server/common/test-helpers/defra-id-network.js'
import { recordEmfDocuments } from '../server/common/test-helpers/emf-documents.js'
import { restoreConfigAfterEach } from '../server/common/test-helpers/restore-config-after-each.js'

const wreckGetMock = vi.hoisted(() => vi.fn())
const getTraceIdMock = vi.hoisted(() => vi.fn())

vi.mock('@hapi/wreck', () => ({
  default: { get: wreckGetMock }
}))

vi.mock('@defra/hapi-tracing', () => ({
  getTraceId: getTraceIdMock
}))

function timedOut() {
  const error = new AggregateError(
    [new Error('connect ETIMEDOUT 127.0.0.1:3007')],
    'ETIMEDOUT'
  )
  error.code = 'ETIMEDOUT'
  return error
}

describe('getOidcConfigWithRetry', () => {
  const discoveryUrl =
    'https://defra-id-stub/idp/.well-known/openid-configuration'
  const payload = { authorization_endpoint: 'https://defra-id-stub/auth' }
  const failedDiscoveryCall = { ...defraIdDiscoveryCall, failure: 1 }
  const successfulDiscoveryCall = { ...defraIdDiscoveryCall, failure: 0 }

  const emf = recordEmfDocuments()
  restoreConfigAfterEach(['defraId.oidcDiscoveryUrl'])
  let logger

  beforeEach(() => {
    vi.useFakeTimers()
    wreckGetMock.mockReset()
    getTraceIdMock.mockReset()

    config.set('defraId.oidcDiscoveryUrl', discoveryUrl)
    getTraceIdMock.mockReturnValue('test-trace-id')

    logger = { warn: vi.fn() }
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('returns the discovery document without retrying when the first call succeeds', async () => {
    wreckGetMock.mockResolvedValue({ payload })

    await expect(getOidcConfigWithRetry(logger)).resolves.toEqual(payload)

    expect(wreckGetMock).toHaveBeenCalledTimes(1)
    expect(logger.warn).not.toHaveBeenCalled()
  })

  test('retries after a timeout, returns the document once the provider answers, and records a failed then a successful defra-id openid-configuration call', async () => {
    wreckGetMock
      .mockRejectedValueOnce(timedOut())
      .mockResolvedValueOnce({ payload })

    const result = getOidcConfigWithRetry(logger)
    let settled = false
    const tracked = result.then((value) => {
      settled = true
      return value
    })

    await vi.advanceTimersByTimeAsync(999)
    expect(settled).toBe(false)

    await vi.advanceTimersByTimeAsync(1)

    await expect(tracked).resolves.toEqual(payload)
    expect(wreckGetMock).toHaveBeenCalledTimes(2)
    expect(logger.warn).toHaveBeenCalledTimes(1)
    await vi.waitFor(() =>
      expect(emf.externalCalls()).toEqual([
        failedDiscoveryCall,
        successfulDiscoveryCall
      ])
    )
  })

  test('gives up only after the full 1s, 2s and 4s backoff, throws an error naming the discovery URL, and records four failed defra-id openid-configuration calls', async () => {
    wreckGetMock.mockRejectedValue(timedOut())

    const result = getOidcConfigWithRetry(logger)
    let settled = false
    const tracked = result.catch((error) => {
      settled = true
      return error
    })

    await vi.advanceTimersByTimeAsync(6999)
    expect(settled).toBe(false)

    await vi.advanceTimersByTimeAsync(1)
    const error = await tracked

    expect(error.message).toBe(
      `OIDC discovery at ${discoveryUrl} failed after 4 attempts`
    )
    expect(error.cause.code).toBe('ETIMEDOUT')
    expect(wreckGetMock).toHaveBeenCalledTimes(4)
    expect(logger.warn).toHaveBeenCalledTimes(3)
    await vi.waitFor(() =>
      expect(emf.externalCalls()).toEqual(Array(4).fill(failedDiscoveryCall))
    )
  })
})
