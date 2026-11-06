import { config } from '../config/config.js'
import { restoreConfigAfterEach } from '../server/common/test-helpers/restore-config-after-each.js'
import {
  setStackDefraIdRewrite,
  STACK_DEFRA_ID_REWRITE_KEYS
} from '../server/common/test-helpers/stack-defra-id-rewrite.js'
import {
  getBrowserFacingDiscoveryUrl,
  withServerSideEndpointsAtDiscoveryHostname
} from './defra-id-hostnames.js'

const DISCOVERY_PATH = '/idphub/b2c/.well-known/openid-configuration'

const configureDiscovery = (origin) =>
  config.set('defraId.oidcDiscoveryUrl', `${origin}${DISCOVERY_PATH}`)

describe('#defraIdHostnames', () => {
  restoreConfigAfterEach([
    'defraId.oidcDiscoveryUrl',
    ...STACK_DEFRA_ID_REWRITE_KEYS
  ])

  describe('getBrowserFacingDiscoveryUrl', () => {
    test('Should rewrite a listed Docker hostname to the configured target, keeping the port', () => {
      setStackDefraIdRewrite()
      configureDiscovery('http://host.docker.internal:3007')

      expect(getBrowserFacingDiscoveryUrl().toString()).toBe(
        `http://localhost:3007${DISCOVERY_PATH}`
      )
    })

    test('Should leave the URL unchanged when the rewrite is disabled', () => {
      setStackDefraIdRewrite()
      config.set('defraId.browserFacingHostnameRewrite.enabled', false)
      configureDiscovery('http://host.docker.internal:3007')

      expect(getBrowserFacingDiscoveryUrl().toString()).toBe(
        `http://host.docker.internal:3007${DISCOVERY_PATH}`
      )
    })

    test('Should leave an unlisted hostname unchanged', () => {
      setStackDefraIdRewrite()
      configureDiscovery('https://defra-id.example.test')

      expect(getBrowserFacingDiscoveryUrl().toString()).toBe(
        `https://defra-id.example.test${DISCOVERY_PATH}`
      )
    })
  })

  describe('withServerSideEndpointsAtDiscoveryHostname', () => {
    const servedDocument = {
      authorization_endpoint: 'http://localhost:3007/idphub/authorize',
      token_endpoint: 'http://localhost:3008/idphub/token',
      jwks_uri: 'https://localhost:3009/idphub/keys?kid=one'
    }

    test('Should put token_endpoint and jwks_uri at the stack discovery hostname, keeping ports and paths', () => {
      setStackDefraIdRewrite()
      configureDiscovery('http://host.docker.internal:3007')

      const result = withServerSideEndpointsAtDiscoveryHostname(servedDocument)

      expect(result).toEqual({
        authorization_endpoint: 'http://localhost:3007/idphub/authorize',
        token_endpoint: 'http://host.docker.internal:3008/idphub/token',
        jwks_uri: 'https://host.docker.internal:3009/idphub/keys?kid=one'
      })
    })

    test('Should put token_endpoint and jwks_uri at localhost when discovery is at the rewrite target', () => {
      setStackDefraIdRewrite()
      configureDiscovery('http://localhost:3007')

      const result = withServerSideEndpointsAtDiscoveryHostname({
        ...servedDocument,
        token_endpoint: 'http://host.docker.internal:3008/idphub/token',
        jwks_uri: 'http://host.docker.internal:3009/idphub/keys'
      })

      expect(result).toEqual({
        authorization_endpoint: 'http://localhost:3007/idphub/authorize',
        token_endpoint: 'http://localhost:3008/idphub/token',
        jwks_uri: 'http://localhost:3009/idphub/keys'
      })
    })

    test('Should keep endpoints already at the discovery hostname exactly as served', () => {
      setStackDefraIdRewrite()
      configureDiscovery('http://localhost:3007')
      const alreadyAtDiscoveryHostname = {
        token_endpoint: 'http://localhost/token',
        jwks_uri: 'http://localhost/jwks'
      }

      expect(
        withServerSideEndpointsAtDiscoveryHostname(alreadyAtDiscoveryHostname)
      ).toEqual(alreadyAtDiscoveryHostname)
    })

    test('Should return the document exactly as served when the rewrite is disabled', () => {
      setStackDefraIdRewrite()
      config.set('defraId.browserFacingHostnameRewrite.enabled', false)
      configureDiscovery('http://host.docker.internal:3007')

      expect(
        withServerSideEndpointsAtDiscoveryHostname(servedDocument)
      ).toEqual(servedDocument)
    })

    test('Should return the document exactly as served when the discovery hostname is unlisted', () => {
      setStackDefraIdRewrite()
      configureDiscovery('https://defra-id.example.test')

      expect(
        withServerSideEndpointsAtDiscoveryHostname(servedDocument)
      ).toEqual(servedDocument)
    })

    test('Should return a document without the endpoint keys exactly as served', () => {
      setStackDefraIdRewrite()
      configureDiscovery('http://host.docker.internal:3007')
      const withoutEndpoints = {
        authorization_endpoint: 'http://localhost:3007/idphub/authorize'
      }

      expect(
        withServerSideEndpointsAtDiscoveryHostname(withoutEndpoints)
      ).toEqual(withoutEndpoints)
    })

    test('Should keep endpoint values that are not strings exactly as served', () => {
      setStackDefraIdRewrite()
      configureDiscovery('http://host.docker.internal:3007')
      const notStrings = { token_endpoint: null, jwks_uri: 12345 }

      expect(withServerSideEndpointsAtDiscoveryHostname(notStrings)).toEqual(
        notStrings
      )
    })

    test('Should leave the document it was given unchanged', () => {
      setStackDefraIdRewrite()
      configureDiscovery('http://host.docker.internal:3007')
      const given = { ...servedDocument }

      withServerSideEndpointsAtDiscoveryHostname(given)

      expect(given).toEqual(servedDocument)
    })
  })
})
