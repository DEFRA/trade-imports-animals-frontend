import nock from 'nock'
import { afterEach, beforeEach } from 'vitest'

import { config } from '../../../config/config.js'
import { statusCodes } from '../constants/status-codes.js'
import { restoreConfigAfterEach } from './restore-config-after-each.js'

const DEFRA_ID_ORIGIN = 'https://defra-id.test'
const DISCOVERY_PATH = '/idp/.well-known/openid-configuration'

export const DEFRA_ID_DISCOVERY_URL = `${DEFRA_ID_ORIGIN}${DISCOVERY_PATH}`

export const defraIdDiscoveryDocument = {
  issuer: `${DEFRA_ID_ORIGIN}/idp`,
  authorization_endpoint: `${DEFRA_ID_ORIGIN}/idp/authorize`,
  token_endpoint: `${DEFRA_ID_ORIGIN}/idp/token`,
  jwks_uri: `${DEFRA_ID_ORIGIN}/idp/jwks`
}

/**
 * Points Defra ID discovery at a host that only nock answers, and refuses every
 * other outbound connection, during each test of the enclosing `describe`.
 * Clears the interceptors and restores the discovery URL afterwards.
 *
 * @returns {{
 *   defraId: () => import('nock').Scope,
 *   interceptDiscovery: () => import('nock').Interceptor,
 *   serveDiscovery: () => import('nock').Scope
 * }} `defraId` intercepts requests to the Defra ID host; `interceptDiscovery`
 *   intercepts one discovery fetch, for the test to answer; `serveDiscovery`
 *   answers one with `defraIdDiscoveryDocument`
 */
export const useDefraIdNetwork = () => {
  restoreConfigAfterEach(['defraId.oidcDiscoveryUrl'])

  beforeEach(() => {
    nock.disableNetConnect()
    config.set('defraId.oidcDiscoveryUrl', DEFRA_ID_DISCOVERY_URL)
  })

  afterEach(() => {
    nock.cleanAll()
    nock.enableNetConnect()
  })

  const defraId = () => nock(DEFRA_ID_ORIGIN)

  const interceptDiscovery = () => defraId().get(DISCOVERY_PATH)

  const serveDiscovery = () =>
    interceptDiscovery().reply(statusCodes.ok, defraIdDiscoveryDocument)

  return { defraId, interceptDiscovery, serveDiscovery }
}
