import nock from 'nock'
import { afterEach, beforeEach } from 'vitest'

import { config } from '../../../config/config.js'
import { statusCodes } from '../constants/status-codes.js'
import { restoreConfigAfterEach } from './restore-config-after-each.js'

const DEFRA_ID_ORIGIN = 'https://defra-id.test'
const DISCOVERY_PATH = '/idp/.well-known/openid-configuration'

export const defraIdDiscoveryDocument = {
  issuer: `${DEFRA_ID_ORIGIN}/idp`,
  authorization_endpoint: `${DEFRA_ID_ORIGIN}/idp/authorize`,
  token_endpoint: `${DEFRA_ID_ORIGIN}/idp/token`,
  jwks_uri: `${DEFRA_ID_ORIGIN}/idp/jwks`
}

export const defraIdDiscoveryCall = Object.freeze({
  dependency: 'defra-id',
  operation: 'openid-configuration'
})

/**
 * Points Defra ID discovery at a host that only nock answers, and refuses every
 * other outbound connection, during each test of the enclosing `describe`.
 * Clears the interceptors and restores the discovery URL afterwards.
 *
 * @returns {{
 *   defraId: () => import('nock').Scope,
 *   discoverAt: (origin: string) => void,
 *   interceptDiscovery: (origin?: string) => import('nock').Interceptor,
 *   serveDiscovery: () => import('nock').Scope,
 *   interceptJwks: () => import('nock').Interceptor
 * }} `defraId` intercepts requests to the Defra ID host; `discoverAt` points
 *   discovery at another origin, on the same path; `interceptDiscovery`
 *   intercepts one discovery fetch from the Defra ID host, or from the origin
 *   given, for the test to answer; `serveDiscovery` answers one with
 *   `defraIdDiscoveryDocument`; `interceptJwks` intercepts one fetch of the
 *   keys at that document's `jwks_uri`
 */
export const useDefraIdNetwork = () => {
  restoreConfigAfterEach(['defraId.oidcDiscoveryUrl'])

  const discoverAt = (origin) =>
    config.set('defraId.oidcDiscoveryUrl', `${origin}${DISCOVERY_PATH}`)

  beforeEach(() => {
    nock.disableNetConnect()
    discoverAt(DEFRA_ID_ORIGIN)
  })

  afterEach(() => {
    nock.cleanAll()
    nock.enableNetConnect()
  })

  const defraId = () => nock(DEFRA_ID_ORIGIN)

  const interceptDiscovery = (origin = DEFRA_ID_ORIGIN) =>
    nock(origin).get(DISCOVERY_PATH)

  const serveDiscovery = () =>
    interceptDiscovery().reply(statusCodes.ok, defraIdDiscoveryDocument)

  const interceptJwks = () =>
    defraId().get(new URL(defraIdDiscoveryDocument.jwks_uri).pathname)

  return {
    defraId,
    discoverAt,
    interceptDiscovery,
    serveDiscovery,
    interceptJwks
  }
}
