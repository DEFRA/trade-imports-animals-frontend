import Wreck from '@hapi/wreck'
import { getTraceId } from '@defra/hapi-tracing'
import { config } from '../config/config.js'

const SERVER_SIDE_ENDPOINTS = ['token_endpoint', 'jwks_uri']

async function getOidcConfig() {
  // Fetch the OpenID Connect configuration from the well-known endpoint
  // Contains the URLs for authorisation, sign out, token and public keys in JSON format
  const discoveryUrl = config.get('defraId.oidcDiscoveryUrl')
  const { payload } = await Wreck.get(discoveryUrl, {
    headers: { [config.get('tracing.header')]: getTraceId() ?? '' },
    json: true
  })

  // The discovery doc's server-side endpoints may use a hostname this process
  // can't reach (e.g. host.docker.internal when running natively). Normalise
  // them to the hostname we already proved we can reach.
  const discoveryHostname = new URL(discoveryUrl).hostname
  for (const key of SERVER_SIDE_ENDPOINTS) {
    if (typeof payload[key] !== 'string') continue
    const endpoint = new URL(payload[key])
    endpoint.hostname = discoveryHostname
    payload[key] = endpoint.toString()
  }

  return payload
}

export { getOidcConfig }
