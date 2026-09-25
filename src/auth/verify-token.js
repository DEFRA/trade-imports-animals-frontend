import { createPublicKey } from 'node:crypto'
import Wreck from '@hapi/wreck'
import Jwt from '@hapi/jwt'
import { getTraceId } from '@defra/hapi-tracing'
import { getOidcConfig, OIDC_DOCUMENT_TIMEOUT_MS } from './get-oidc-config.js'
import { config } from '../config/config.js'

async function verifyToken(token) {
  const oidcConfig = await getOidcConfig()
  const { jwks_uri: uri, issuer } = oidcConfig

  const { payload } = await Wreck.get(uri, {
    headers: { [config.get('tracing.header')]: getTraceId() ?? '' },
    json: true,
    timeout: OIDC_DOCUMENT_TIMEOUT_MS
  })
  const { keys } = payload

  const pem = createPublicKey({ key: keys[0], format: 'jwk' }).export({
    type: 'spki',
    format: 'pem'
  })

  const decoded = Jwt.token.decode(token)
  Jwt.token.verify(decoded, {
    key: pem,
    algorithm: 'RS256',
    aud: config.get('defraId.clientId'),
    iss: issuer
  })
}

export { verifyToken }
