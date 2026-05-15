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
  const localDiscoveryUrl =
    'https://localhost/idp/.well-known/openid-configuration'
  const tracingHeader = 'x-cdp-request-id'
  const traceId = 'test-trace-id'

  beforeEach(() => {
    wreckGetMock.mockReset()
    configGetMock.mockReset()
    getTraceIdMock.mockReset()

    configGetMock.mockImplementation((key) => {
      if (key === 'defraId.oidcDiscoveryUrl') return localDiscoveryUrl
      if (key === 'tracing.header') return tracingHeader
    })
    getTraceIdMock.mockReturnValue(traceId)
  })

  test('fetches discovery document with tracing header', async () => {
    const payload = {
      authorization_endpoint: 'https://localhost/auth'
    }

    wreckGetMock.mockResolvedValue({ payload })

    await getOidcConfig()

    expect(configGetMock).toHaveBeenCalledWith('defraId.oidcDiscoveryUrl')
    expect(wreckGetMock).toHaveBeenCalledWith(localDiscoveryUrl, {
      headers: { [tracingHeader]: traceId },
      json: true
    })
  })

  test('rewrites token_endpoint and jwks_uri hostnames to discovery URL hostname', async () => {
    const payload = {
      authorization_endpoint: 'https://external-host/auth',
      token_endpoint: 'https://internal-host:9443/token',
      jwks_uri: 'https://internal-host:9443/jwks'
    }

    wreckGetMock.mockResolvedValue({ payload })

    const result = await getOidcConfig()

    expect(result.token_endpoint).toBe('https://localhost:9443/token')
    expect(result.jwks_uri).toBe('https://localhost:9443/jwks')
  })

  test('leaves authorization_endpoint unchanged', async () => {
    const payload = {
      authorization_endpoint: 'https://external-host/auth',
      token_endpoint: 'https://internal-host/token',
      jwks_uri: 'https://internal-host/jwks'
    }

    wreckGetMock.mockResolvedValue({ payload })

    const result = await getOidcConfig()

    expect(result.authorization_endpoint).toBe('https://external-host/auth')
  })

  test('does not rewrite endpoints that already match the discovery hostname', async () => {
    const payload = {
      token_endpoint: 'https://localhost/token',
      jwks_uri: 'https://localhost/jwks'
    }

    wreckGetMock.mockResolvedValue({ payload })

    const result = await getOidcConfig()

    expect(result.token_endpoint).toBe('https://localhost/token')
    expect(result.jwks_uri).toBe('https://localhost/jwks')
  })

  test('does not rewrite endpoints when discovery URL is a non-local hostname', async () => {
    const productionDiscoveryUrl =
      'https://real-auth-server/idp/.well-known/openid-configuration'

    configGetMock.mockImplementation((key) => {
      if (key === 'defraId.oidcDiscoveryUrl') return productionDiscoveryUrl
      if (key === 'tracing.header') return tracingHeader
    })

    const payload = {
      authorization_endpoint: 'https://external-host/auth',
      token_endpoint: 'https://internal-host:9443/token',
      jwks_uri: 'https://internal-host:9443/jwks'
    }

    wreckGetMock.mockResolvedValue({ payload })

    const result = await getOidcConfig()

    expect(result.token_endpoint).toBe('https://internal-host:9443/token')
    expect(result.jwks_uri).toBe('https://internal-host:9443/jwks')
    expect(result.authorization_endpoint).toBe('https://external-host/auth')
  })

  test('rewrites endpoints when discovery URL uses host.docker.internal', async () => {
    const dockerDiscoveryUrl =
      'https://host.docker.internal/idp/.well-known/openid-configuration'

    configGetMock.mockImplementation((key) => {
      if (key === 'defraId.oidcDiscoveryUrl') return dockerDiscoveryUrl
      if (key === 'tracing.header') return tracingHeader
    })

    const payload = {
      token_endpoint: 'https://internal-host:9443/token',
      jwks_uri: 'https://internal-host:9443/jwks'
    }

    wreckGetMock.mockResolvedValue({ payload })

    const result = await getOidcConfig()

    expect(result.token_endpoint).toBe(
      'https://host.docker.internal:9443/token'
    )
    expect(result.jwks_uri).toBe('https://host.docker.internal:9443/jwks')
  })

  test('skips rewriting when server-side endpoint keys are missing from payload', async () => {
    const payload = {
      authorization_endpoint: 'https://external-host/auth'
    }

    wreckGetMock.mockResolvedValue({ payload })

    const result = await getOidcConfig()

    expect(result).toEqual({
      authorization_endpoint: 'https://external-host/auth'
    })
    expect(result.token_endpoint).toBeUndefined()
    expect(result.jwks_uri).toBeUndefined()
  })

  test('skips rewriting when server-side endpoint values are not strings', async () => {
    const payload = {
      token_endpoint: null,
      jwks_uri: 12345
    }

    wreckGetMock.mockResolvedValue({ payload })

    const result = await getOidcConfig()

    expect(result.token_endpoint).toBeNull()
    expect(result.jwks_uri).toBe(12345)
  })

  test('preserves port from the original endpoint when rewriting hostname', async () => {
    const payload = {
      token_endpoint: 'https://other-host:8443/oauth/token',
      jwks_uri: 'http://other-host:8080/.well-known/jwks.json'
    }

    wreckGetMock.mockResolvedValue({ payload })

    const result = await getOidcConfig()

    expect(result.token_endpoint).toBe('https://localhost:8443/oauth/token')
    expect(result.jwks_uri).toBe('http://localhost:8080/.well-known/jwks.json')
  })

  test('propagates Wreck errors', async () => {
    const err = new Error('discovery failed')

    wreckGetMock.mockRejectedValue(err)

    await expect(getOidcConfig()).rejects.toThrow('discovery failed')
    expect(wreckGetMock).toHaveBeenCalledWith(localDiscoveryUrl, {
      headers: { [tracingHeader]: traceId },
      json: true
    })
  })
})
