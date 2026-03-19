import { vi } from 'vitest'

const configGetMock = vi.hoisted(() => vi.fn())

vi.mock('../config/config.js', () => ({
  config: {
    get: configGetMock
  }
}))

import { getSignOutUrl } from './get-sign-out-url.js'

describe('getSignOutUrl', () => {
  beforeEach(() => {
    configGetMock.mockReset()
  })

  test('builds signout URL from discovery URL', async () => {
    const discoveryUrl =
      'https://mock-auth-server/some/tenant/.well-known/openid-configuration'

    configGetMock.mockReturnValue(discoveryUrl)

    const url = await getSignOutUrl({}, 'token')

    expect(configGetMock).toHaveBeenCalledWith('defraId.oidcDiscoveryUrl')
    expect(url).toBe('https://mock-auth-server/some/tenant/signout')
  })

  test('handles discovery URL at root /.well-known/openid-configuration', async () => {
    const discoveryUrl =
      'https://mock-auth-server/.well-known/openid-configuration'

    configGetMock.mockReturnValue(discoveryUrl)

    const url = await getSignOutUrl({}, 'token')

    expect(configGetMock).toHaveBeenCalledWith('defraId.oidcDiscoveryUrl')
    expect(url).toBe('https://mock-auth-server/signout')
  })
})
