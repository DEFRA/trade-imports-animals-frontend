import { createPublicKey } from 'node:crypto'
import Wreck from '@hapi/wreck'
import Jwt from '@hapi/jwt'
import { getTraceId } from '@defra/hapi-tracing'
import { getOidcConfig } from './get-oidc-config.js'
import { config } from '../config/config.js'

async function verifyToken(token) {
  const { jwks_uri: uri } = await getOidcConfig()

  const { payload } = await Wreck.get(uri, {
    headers: { [config.get('tracing.header')]: getTraceId() ?? '' },
    json: true
  })
  const { keys } = payload

  // Convert the JSON Web Key (JWK) to a PEM-encoded public key so that it can be used to verify the token
  const pem = createPublicKey({ key: keys[0], format: 'jwk' }).export({
    type: 'spki',
    format: 'pem'
  })

  // Check that the token is signed with the appropriate key by decoding it and verifying the signature using the public key
  const decoded = Jwt.token.decode(token)
  Jwt.token.verify(decoded, { key: pem, algorithm: 'RS256' })
}

export { verifyToken }
