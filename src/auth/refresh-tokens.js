import Wreck from '@hapi/wreck'
import { getTraceId } from '@defra/hapi-tracing'
import { getOidcConfig } from './get-oidc-config.js'
import { config } from '../config/config.js'
import { measureExternalCall } from '../server/common/helpers/metrics/external-call-metrics.js'
import { DEFRA_ID_CALLS } from './defra-id-calls.js'

async function refreshTokens(refreshToken) {
  const tokenEndpointTimeoutMs = 3000
  const { token_endpoint: url } = await getOidcConfig()

  const payload = new URLSearchParams({
    client_id: config.get('defraId.clientId'),
    client_secret: config.get('defraId.clientSecret'),
    grant_type: 'refresh_token',
    scope: `openid offline_access ${config.get('defraId.clientId')}`,
    refresh_token: refreshToken,
    redirect_uri: config.get('defraId.redirectUrl')
  })

  const { payload: responsePayload } = await measureExternalCall(
    DEFRA_ID_CALLS.tokenRefresh,
    () =>
      Wreck.post(url, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          [config.get('tracing.header')]: getTraceId() ?? ''
        },
        payload: payload.toString(),
        json: true,
        timeout: tokenEndpointTimeoutMs
      })
  )

  return responsePayload
}

export { refreshTokens }
