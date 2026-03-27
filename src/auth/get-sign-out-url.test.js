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
    configGetMock.mockImplementation((key) => {
      if (key === 'defraId.signOutHostnameRewrite.enabled') {
        return true
      }
      if (key === 'defraId.signOutHostnameRewrite.from') {
        return ['host.docker.internal', 'trade-imports-defra-id-stub']
      }
      if (key === 'defraId.signOutHostnameRewrite.to') {
        return 'localhost'
      }
      return undefined
    })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  test('builds signout URL from discovery URL', async () => {
    const discoveryUrl =
      'https://mock-auth-server/some/tenant/.well-known/openid-configuration'

    configGetMock.mockImplementation((key) => {
      if (key === 'defraId.oidcDiscoveryUrl') {
        return discoveryUrl
      }
      if (key === 'defraId.signOutHostnameRewrite.enabled') {
        return true
      }
      if (key === 'defraId.signOutHostnameRewrite.from') {
        return ['host.docker.internal', 'trade-imports-defra-id-stub']
      }
      if (key === 'defraId.signOutHostnameRewrite.to') {
        return 'localhost'
      }
      return undefined
    })

    const url = await getSignOutUrl({}, 'token')

    expect(configGetMock).toHaveBeenCalledWith('defraId.oidcDiscoveryUrl')
    expect(url).toBe('https://mock-auth-server/some/tenant/signout')
  })

  test('handles discovery URL at root /.well-known/openid-configuration', async () => {
    const discoveryUrl =
      'https://mock-auth-server/.well-known/openid-configuration'

    configGetMock.mockImplementation((key) => {
      if (key === 'defraId.oidcDiscoveryUrl') {
        return discoveryUrl
      }
      if (key === 'defraId.signOutHostnameRewrite.enabled') {
        return true
      }
      if (key === 'defraId.signOutHostnameRewrite.from') {
        return ['host.docker.internal', 'trade-imports-defra-id-stub']
      }
      if (key === 'defraId.signOutHostnameRewrite.to') {
        return 'localhost'
      }
      return undefined
    })

    const url = await getSignOutUrl({}, 'token')

    expect(configGetMock).toHaveBeenCalledWith('defraId.oidcDiscoveryUrl')
    expect(url).toBe('https://mock-auth-server/signout')
  })

  test('rewrites configured Docker internal OIDC hostnames using configured target hostname', async () => {
    configGetMock.mockImplementation((key) => {
      if (key === 'defraId.oidcDiscoveryUrl') {
        return 'http://host.docker.internal:3007/idphub/b2c/b2c_1a/.well-known/openid-configuration'
      }
      if (key === 'defraId.signOutHostnameRewrite.enabled') {
        return true
      }
      if (key === 'defraId.signOutHostnameRewrite.from') {
        return ['host.docker.internal', 'trade-imports-defra-id-stub']
      }
      if (key === 'defraId.signOutHostnameRewrite.to') {
        return 'localhost'
      }
      return undefined
    })

    const url = await getSignOutUrl({}, 'token')

    expect(url).toBe('http://localhost:3007/idphub/b2c/b2c_1a/signout')
  })

  test('rewrites trade-imports-defra-id-stub hostname when configured', async () => {
    configGetMock.mockImplementation((key) => {
      if (key === 'defraId.oidcDiscoveryUrl') {
        return 'http://trade-imports-defra-id-stub:3007/idphub/b2c/b2c_1a/.well-known/openid-configuration'
      }
      if (key === 'defraId.signOutHostnameRewrite.enabled') {
        return true
      }
      if (key === 'defraId.signOutHostnameRewrite.from') {
        return ['host.docker.internal', 'trade-imports-defra-id-stub']
      }
      if (key === 'defraId.signOutHostnameRewrite.to') {
        return 'localhost'
      }
      return undefined
    })

    const url = await getSignOutUrl({}, 'token')

    expect(url).toBe('http://localhost:3007/idphub/b2c/b2c_1a/signout')
  })

  test('does not rewrite when hostname rewrite is disabled in config', async () => {
    configGetMock.mockImplementation((key) => {
      if (key === 'defraId.oidcDiscoveryUrl') {
        return 'http://host.docker.internal:3007/idphub/b2c/b2c_1a/.well-known/openid-configuration'
      }
      if (key === 'defraId.signOutHostnameRewrite.enabled') {
        return false
      }
      if (key === 'defraId.signOutHostnameRewrite.from') {
        return ['host.docker.internal', 'trade-imports-defra-id-stub']
      }
      if (key === 'defraId.signOutHostnameRewrite.to') {
        return 'localhost'
      }
      return undefined
    })

    const url = await getSignOutUrl({}, 'token')

    expect(url).toBe(
      'http://host.docker.internal:3007/idphub/b2c/b2c_1a/signout'
    )
  })
})
