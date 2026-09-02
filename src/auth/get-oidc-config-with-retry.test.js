import { vi } from 'vitest'
import { getOidcConfigWithRetry } from './get-oidc-config-with-retry.js'

const wreckGetMock = vi.hoisted(() => vi.fn())
const configGetMock = vi.hoisted(() => vi.fn())
const getTraceIdMock = vi.hoisted(() => vi.fn())

vi.mock('@hapi/wreck', () => ({
  default: { get: wreckGetMock }
}))

vi.mock('../config/config.js', () => ({
  config: { get: configGetMock }
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

  let logger

  beforeEach(() => {
    vi.useFakeTimers()
    wreckGetMock.mockReset()
    configGetMock.mockReset()
    getTraceIdMock.mockReset()

    configGetMock.mockImplementation((key) => {
      if (key === 'defraId.oidcDiscoveryUrl') return discoveryUrl
      if (key === 'tracing.header') return 'x-cdp-request-id'
    })
    getTraceIdMock.mockReturnValue('test-trace-id')

    logger = { warn: vi.fn(), error: vi.fn() }
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('returns the discovery document without retrying when the first call succeeds', async () => {
    wreckGetMock.mockResolvedValue({ payload })

    await expect(getOidcConfigWithRetry(logger)).resolves.toEqual(payload)

    expect(wreckGetMock).toHaveBeenCalledTimes(1)
    expect(wreckGetMock).toHaveBeenCalledWith(
      discoveryUrl,
      expect.objectContaining({ timeout: 3000 })
    )
    expect(logger.warn).not.toHaveBeenCalled()
  })

  test('retries after a timeout and returns the document once the provider answers', async () => {
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
  })

  test('gives up only after the full 1s, 2s and 4s backoff and throws an error naming the discovery URL', async () => {
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
      `Could not reach the OIDC provider at ${discoveryUrl} after 4 attempts`
    )
    expect(wreckGetMock).toHaveBeenCalledTimes(4)
    expect(logger.warn).toHaveBeenCalledTimes(3)
    expect(logger.error).not.toHaveBeenCalled()
  })

  test('keeps the underlying timeout as the cause of the thrown error', async () => {
    wreckGetMock.mockRejectedValue(timedOut())

    const result = getOidcConfigWithRetry(logger)
    const assertion = result.catch((error) => error)

    await vi.advanceTimersByTimeAsync(7000)
    const error = await assertion

    expect(error).toBeInstanceOf(Error)
    expect(error.cause.code).toBe('ETIMEDOUT')
  })

  test('retries a provider that answers with a document it cannot use, keeping the parse failure as the cause', async () => {
    const localDiscoveryUrl =
      'http://localhost:3007/idp/.well-known/openid-configuration'
    configGetMock.mockImplementation((key) => {
      if (key === 'defraId.oidcDiscoveryUrl') return localDiscoveryUrl
      if (key === 'tracing.header') return 'x-cdp-request-id'
    })
    wreckGetMock.mockResolvedValue({
      payload: { token_endpoint: '/token', jwks_uri: '/jwks' }
    })

    const result = getOidcConfigWithRetry(logger)
    const tracked = result.catch((error) => error)

    await vi.advanceTimersByTimeAsync(7000)
    const error = await tracked

    expect(wreckGetMock).toHaveBeenCalledTimes(4)
    expect(error.message).toBe(
      `Could not reach the OIDC provider at ${localDiscoveryUrl} after 4 attempts`
    )
    expect(error.cause).toBeInstanceOf(TypeError)
  })
})
