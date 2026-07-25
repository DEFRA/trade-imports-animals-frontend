import { vi } from 'vitest'
import { getSignOutUrl } from './get-sign-out-url.js'

const configGetMock = vi.hoisted(() => vi.fn())

vi.mock('../config/config.js', () => ({
  config: {
    get: configGetMock
  }
}))

const SIGN_OUT_REDIRECT_URL = 'http://localhost:3000/auth/sign-out-oidc'
const REDIRECT_QUERY = `?post_logout_redirect_uri=${encodeURIComponent(SIGN_OUT_REDIRECT_URL)}`

function configWith(overrides) {
  return (key) => {
    if (key in overrides) {
      return overrides[key]
    }
    if (key === 'defraId.signOutRedirectUrl') {
      return SIGN_OUT_REDIRECT_URL
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
  }
}

describe('getSignOutUrl', () => {
  beforeEach(() => {
    configGetMock.mockReset()
    configGetMock.mockImplementation(configWith({}))
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  test('builds signout URL from discovery URL with post-logout redirect', async () => {
    configGetMock.mockImplementation(
      configWith({
        'defraId.oidcDiscoveryUrl':
          'https://mock-auth-server/some/tenant/.well-known/openid-configuration'
      })
    )

    const url = await getSignOutUrl({}, 'token')

    expect(configGetMock).toHaveBeenCalledWith('defraId.oidcDiscoveryUrl')
    expect(url).toBe(
      `https://mock-auth-server/some/tenant/signout${REDIRECT_QUERY}`
    )
  })

  test('handles discovery URL at root /.well-known/openid-configuration', async () => {
    configGetMock.mockImplementation(
      configWith({
        'defraId.oidcDiscoveryUrl':
          'https://mock-auth-server/.well-known/openid-configuration'
      })
    )

    const url = await getSignOutUrl({}, 'token')

    expect(configGetMock).toHaveBeenCalledWith('defraId.oidcDiscoveryUrl')
    expect(url).toBe(`https://mock-auth-server/signout${REDIRECT_QUERY}`)
  })

  test('rewrites configured Docker internal OIDC hostnames using configured target hostname', async () => {
    configGetMock.mockImplementation(
      configWith({
        'defraId.oidcDiscoveryUrl':
          'http://host.docker.internal:3007/idphub/b2c/b2c_1a/.well-known/openid-configuration'
      })
    )

    const url = await getSignOutUrl({}, 'token')

    expect(url).toBe(
      `http://localhost:3007/idphub/b2c/b2c_1a/signout${REDIRECT_QUERY}`
    )
  })

  test('rewrites trade-imports-defra-id-stub hostname when configured', async () => {
    configGetMock.mockImplementation(
      configWith({
        'defraId.oidcDiscoveryUrl':
          'http://trade-imports-defra-id-stub:3007/idphub/b2c/b2c_1a/.well-known/openid-configuration'
      })
    )

    const url = await getSignOutUrl({}, 'token')

    expect(url).toBe(
      `http://localhost:3007/idphub/b2c/b2c_1a/signout${REDIRECT_QUERY}`
    )
  })

  test('does not rewrite when hostname rewrite is disabled in config', async () => {
    configGetMock.mockImplementation(
      configWith({
        'defraId.oidcDiscoveryUrl':
          'http://host.docker.internal:3007/idphub/b2c/b2c_1a/.well-known/openid-configuration',
        'defraId.signOutHostnameRewrite.enabled': false
      })
    )

    const url = await getSignOutUrl({}, 'token')

    expect(url).toBe(
      `http://host.docker.internal:3007/idphub/b2c/b2c_1a/signout${REDIRECT_QUERY}`
    )
  })
})
