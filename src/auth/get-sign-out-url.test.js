import { config } from '../config/config.js'
import { getSignOutUrl } from './get-sign-out-url.js'

const SIGN_OUT_REDIRECT_URL = 'http://localhost:3000/auth/sign-out-oidc'
const REDIRECT_QUERY = `?post_logout_redirect_uri=${encodeURIComponent(SIGN_OUT_REDIRECT_URL)}`

const DEFAULT_CONFIG = {
  'defraId.signOutRedirectUrl': SIGN_OUT_REDIRECT_URL,
  'defraId.browserFacingHostnameRewrite.enabled': true,
  'defraId.browserFacingHostnameRewrite.from': [
    'host.docker.internal',
    'trade-imports-defra-id-stub'
  ],
  'defraId.browserFacingHostnameRewrite.to': 'localhost'
}

const configKeys = [...Object.keys(DEFAULT_CONFIG), 'defraId.oidcDiscoveryUrl']

function setConfig(overrides) {
  for (const [key, value] of Object.entries({
    ...DEFAULT_CONFIG,
    ...overrides
  })) {
    config.set(key, value)
  }
}

describe('getSignOutUrl', () => {
  let originalConfig

  beforeEach(() => {
    originalConfig = Object.fromEntries(
      configKeys.map((key) => [key, config.get(key)])
    )
  })

  afterEach(() => {
    for (const [key, value] of Object.entries(originalConfig)) {
      config.set(key, value)
    }
  })

  test('builds signout URL from discovery URL with post-logout redirect', async () => {
    setConfig({
      'defraId.oidcDiscoveryUrl':
        'https://mock-auth-server/some/tenant/.well-known/openid-configuration'
    })

    const url = await getSignOutUrl({}, 'token')

    expect(url).toBe(
      `https://mock-auth-server/some/tenant/signout${REDIRECT_QUERY}`
    )
  })

  test('handles discovery URL at root /.well-known/openid-configuration', async () => {
    setConfig({
      'defraId.oidcDiscoveryUrl':
        'https://mock-auth-server/.well-known/openid-configuration'
    })

    const url = await getSignOutUrl({}, 'token')

    expect(url).toBe(`https://mock-auth-server/signout${REDIRECT_QUERY}`)
  })

  test('rewrites configured Docker internal OIDC hostnames using configured target hostname', async () => {
    setConfig({
      'defraId.oidcDiscoveryUrl':
        'http://host.docker.internal:3007/idphub/b2c/b2c_1a/.well-known/openid-configuration'
    })

    const url = await getSignOutUrl({}, 'token')

    expect(url).toBe(
      `http://localhost:3007/idphub/b2c/b2c_1a/signout${REDIRECT_QUERY}`
    )
  })

  test('rewrites trade-imports-defra-id-stub hostname when configured', async () => {
    setConfig({
      'defraId.oidcDiscoveryUrl':
        'http://trade-imports-defra-id-stub:3007/idphub/b2c/b2c_1a/.well-known/openid-configuration'
    })

    const url = await getSignOutUrl({}, 'token')

    expect(url).toBe(
      `http://localhost:3007/idphub/b2c/b2c_1a/signout${REDIRECT_QUERY}`
    )
  })

  test('does not rewrite when hostname rewrite is disabled in config', async () => {
    setConfig({
      'defraId.oidcDiscoveryUrl':
        'http://host.docker.internal:3007/idphub/b2c/b2c_1a/.well-known/openid-configuration',
      'defraId.browserFacingHostnameRewrite.enabled': false
    })

    const url = await getSignOutUrl({}, 'token')

    expect(url).toBe(
      `http://host.docker.internal:3007/idphub/b2c/b2c_1a/signout${REDIRECT_QUERY}`
    )
  })
})
