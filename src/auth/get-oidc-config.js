import Wreck from '@hapi/wreck'
import { getTraceId } from '@defra/hapi-tracing'
import { config } from '../config/config.js'

const SERVER_SIDE_ENDPOINTS = ['token_endpoint', 'jwks_uri']
const LOCAL_HOSTNAMES = new Set(['localhost', 'host.docker.internal'])

function rewriteEndpointHostnames(payload, targetHostname) {
  for (const key of SERVER_SIDE_ENDPOINTS) {
    if (typeof payload[key] !== 'string') continue
    const endpoint = new URL(payload[key])
    if (endpoint.hostname !== targetHostname) {
      endpoint.hostname = targetHostname
      payload[key] = endpoint.toString()
    }
  }
}

async function getOidcConfig() {
  const discoveryUrl = config.get('defraId.oidcDiscoveryUrl')
  const { payload } = await Wreck.get(discoveryUrl, {
    headers: { [config.get('tracing.header')]: getTraceId() ?? '' },
    json: true
  })

  const discoveryHostname = new URL(discoveryUrl).hostname
  if (LOCAL_HOSTNAMES.has(discoveryHostname)) {
    rewriteEndpointHostnames(payload, discoveryHostname)
  }

  return payload
}

export { getOidcConfig }
