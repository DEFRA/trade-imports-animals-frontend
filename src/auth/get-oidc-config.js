import Wreck from '@hapi/wreck'
import { getTraceId } from '@defra/hapi-tracing'
import { config } from '../config/config.js'
import { measureExternalCall } from '../server/common/helpers/external-call-metrics.js'
import { DEFRA_ID_CALLS } from './defra-id-calls.js'
import { withServerSideEndpointsAtDiscoveryHostname } from './defra-id-hostnames.js'

const OIDC_DOCUMENT_TIMEOUT_MS = 1000

async function getOidcConfig() {
  const { payload } = await measureExternalCall(
    DEFRA_ID_CALLS.openidConfiguration,
    () =>
      Wreck.get(config.get('defraId.oidcDiscoveryUrl'), {
        headers: { [config.get('tracing.header')]: getTraceId() ?? '' },
        json: true,
        timeout: OIDC_DOCUMENT_TIMEOUT_MS
      })
  )

  return withServerSideEndpointsAtDiscoveryHostname(payload)
}

export { getOidcConfig, OIDC_DOCUMENT_TIMEOUT_MS }
