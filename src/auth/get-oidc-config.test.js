import { vi } from 'vitest'

// Must be hoisted too (because vi.mock factories are hoisted)
const wreckGetMock = vi.hoisted(() => vi.fn())
const configGetMock = vi.hoisted(() => vi.fn())

vi.mock('@hapi/wreck', () => ({
  default: { get: wreckGetMock }
}))

vi.mock('../config/config.js', () => ({
  config: { get: configGetMock }
}))

import { getOidcConfig } from './get-oidc-config.js'

describe('getOidcConfig', () => {
  beforeEach(() => {
    wreckGetMock.mockReset()
    configGetMock.mockReset()
  })

  test('fetches discovery document and returns payload', async () => {
    const discoveryUrl =
      'https://mock-auth-server/idp/.well-known/openid-configuration'

    const payload = { authorization_endpoint: 'https://idp/auth' }

    configGetMock.mockReturnValue(discoveryUrl)
    wreckGetMock.mockResolvedValue({ payload })

    await expect(getOidcConfig()).resolves.toEqual(payload)

    expect(configGetMock).toHaveBeenCalledWith('defraId.oidcDiscoveryUrl')
    expect(wreckGetMock).toHaveBeenCalledWith(discoveryUrl, { json: true })
  })

  test('propagates Wreck errors', async () => {
    const discoveryUrl =
      'https://mock-auth-server/idp/.well-known/openid-configuration'

    const err = new Error('discovery failed')

    configGetMock.mockReturnValue(discoveryUrl)
    wreckGetMock.mockRejectedValue(err)

    await expect(getOidcConfig()).rejects.toThrow('discovery failed')
    expect(wreckGetMock).toHaveBeenCalledWith(discoveryUrl, { json: true })
  })
})
