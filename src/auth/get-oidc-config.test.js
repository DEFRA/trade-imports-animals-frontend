import { vi } from 'vitest'
import { getOidcConfig } from './get-oidc-config.js'

// Must be hoisted too (because vi.mock factories are hoisted)
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

describe('getOidcConfig', () => {
  const discoveryUrl =
    'https://mock-auth-server/idp/.well-known/openid-configuration'
  const tracingHeader = 'x-cdp-request-id'
  const traceId = 'test-trace-id'

  beforeEach(() => {
    wreckGetMock.mockReset()
    configGetMock.mockReset()
    getTraceIdMock.mockReset()

    configGetMock.mockImplementation((key) => {
      if (key === 'defraId.oidcDiscoveryUrl') return discoveryUrl
      if (key === 'tracing.header') return tracingHeader
    })
    getTraceIdMock.mockReturnValue(traceId)
  })

  test('fetches discovery document and returns payload', async () => {
    const payload = { authorization_endpoint: 'https://idp/auth' }

    wreckGetMock.mockResolvedValue({ payload })

    await expect(getOidcConfig()).resolves.toEqual(payload)

    expect(configGetMock).toHaveBeenCalledWith('defraId.oidcDiscoveryUrl')
    expect(wreckGetMock).toHaveBeenCalledWith(discoveryUrl, {
      headers: { [tracingHeader]: traceId },
      json: true
    })
  })

  test('propagates Wreck errors', async () => {
    const err = new Error('discovery failed')

    wreckGetMock.mockRejectedValue(err)

    await expect(getOidcConfig()).rejects.toThrow('discovery failed')
    expect(wreckGetMock).toHaveBeenCalledWith(discoveryUrl, {
      headers: { [tracingHeader]: traceId },
      json: true
    })
  })
})
