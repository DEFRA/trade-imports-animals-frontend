import { config } from '../config/config.js'
import { getSignOutUrl } from './get-sign-out-url.js'
import { restoreConfigAfterEach } from '../server/common/test-helpers/restore-config-after-each.js'
import {
  setStackDefraIdRewrite,
  STACK_DEFRA_ID_REWRITE_KEYS
} from '../server/common/test-helpers/stack-defra-id-rewrite.js'

const SIGN_OUT_REDIRECT_URL = 'http://localhost:3000/auth/sign-out-oidc'
const REDIRECT_QUERY = `?post_logout_redirect_uri=${encodeURIComponent(SIGN_OUT_REDIRECT_URL)}`

describe('getSignOutUrl', () => {
  restoreConfigAfterEach([
    'defraId.oidcDiscoveryUrl',
    'defraId.signOutRedirectUrl',
    ...STACK_DEFRA_ID_REWRITE_KEYS
  ])

  beforeEach(() => {
    setStackDefraIdRewrite()
    config.set('defraId.signOutRedirectUrl', SIGN_OUT_REDIRECT_URL)
  })

  test('builds signout URL from discovery URL with post-logout redirect', async () => {
    config.set(
      'defraId.oidcDiscoveryUrl',
      'https://mock-auth-server/some/tenant/.well-known/openid-configuration'
    )

    const url = await getSignOutUrl({}, 'token')

    expect(url).toBe(
      `https://mock-auth-server/some/tenant/signout${REDIRECT_QUERY}`
    )
  })

  test('handles discovery URL at root /.well-known/openid-configuration', async () => {
    config.set(
      'defraId.oidcDiscoveryUrl',
      'https://mock-auth-server/.well-known/openid-configuration'
    )

    const url = await getSignOutUrl({}, 'token')

    expect(url).toBe(`https://mock-auth-server/signout${REDIRECT_QUERY}`)
  })

  test('rewrites configured Docker internal OIDC hostnames using configured target hostname', async () => {
    config.set(
      'defraId.oidcDiscoveryUrl',
      'http://host.docker.internal:3007/idphub/b2c/b2c_1a/.well-known/openid-configuration'
    )

    const url = await getSignOutUrl({}, 'token')

    expect(url).toBe(
      `http://localhost:3007/idphub/b2c/b2c_1a/signout${REDIRECT_QUERY}`
    )
  })

  test('rewrites trade-imports-defra-id-stub hostname when configured', async () => {
    config.set(
      'defraId.oidcDiscoveryUrl',
      'http://trade-imports-defra-id-stub:3007/idphub/b2c/b2c_1a/.well-known/openid-configuration'
    )

    const url = await getSignOutUrl({}, 'token')

    expect(url).toBe(
      `http://localhost:3007/idphub/b2c/b2c_1a/signout${REDIRECT_QUERY}`
    )
  })

  test('does not rewrite when hostname rewrite is disabled in config', async () => {
    config.set(
      'defraId.oidcDiscoveryUrl',
      'http://host.docker.internal:3007/idphub/b2c/b2c_1a/.well-known/openid-configuration'
    )
    config.set('defraId.browserFacingHostnameRewrite.enabled', false)

    const url = await getSignOutUrl({}, 'token')

    expect(url).toBe(
      `http://host.docker.internal:3007/idphub/b2c/b2c_1a/signout${REDIRECT_QUERY}`
    )
  })
})
