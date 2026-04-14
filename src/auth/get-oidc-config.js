import Wreck from '@hapi/wreck'
import { getTraceId } from '@defra/hapi-tracing'
import { config } from '../config/config.js'

async function getOidcConfig() {
  // Fetch the OpenID Connect configuration from the well-known endpoint
  // Contains the URLs for authorisation, sign out, token and public keys in JSON format
  const { payload } = await Wreck.get(config.get('defraId.oidcDiscoveryUrl'), {
    headers: { [config.get('tracing.header')]: getTraceId() ?? '' },
    json: true
  })

  return payload
}

export { getOidcConfig }
