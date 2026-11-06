import { config } from '../config/config.js'

const readHostnameRewrite = () => ({
  enabled: config.get('defraId.browserFacingHostnameRewrite.enabled'),
  from: config.get('defraId.browserFacingHostnameRewrite.from'),
  to: config.get('defraId.browserFacingHostnameRewrite.to')
})

const isCoveredByRewrite = (hostname, rewrite) =>
  rewrite.enabled &&
  (hostname === rewrite.to || rewrite.from.includes(hostname))

const endpointAtHostname = (endpoint, hostname) => {
  const url = new URL(endpoint)
  if (url.hostname === hostname) {
    return endpoint
  }
  url.hostname = hostname
  return url.toString()
}

/**
 * The Defra ID OIDC discovery URL as a browser reaches it: the configured
 * discovery URL, with its hostname rewritten to the configured target when the
 * rewrite is enabled and the hostname is one the rewrite covers.
 *
 * @returns {URL}
 */
function getBrowserFacingDiscoveryUrl() {
  const discoveryUrl = new URL(config.get('defraId.oidcDiscoveryUrl'))

  const rewrite = readHostnameRewrite()
  if (isCoveredByRewrite(discoveryUrl.hostname, rewrite)) {
    discoveryUrl.hostname = rewrite.to
  }
  return discoveryUrl
}

/**
 * A copy of the OIDC discovery document with its token_endpoint and jwks_uri
 * at the hostname the document was fetched from, when the rewrite is enabled
 * and covers that hostname. Ports, paths and every other key are kept.
 *
 * @param {object} oidcDocument
 * @returns {object}
 */
const withServerSideEndpointsAtDiscoveryHostname = (oidcDocument) => {
  const { hostname } = new URL(config.get('defraId.oidcDiscoveryUrl'))
  if (!isCoveredByRewrite(hostname, readHostnameRewrite())) {
    return { ...oidcDocument }
  }

  const serverSideEndpoints = ['token_endpoint', 'jwks_uri']
  const rewrittenEndpoints = Object.fromEntries(
    serverSideEndpoints
      .filter((key) => typeof oidcDocument[key] === 'string')
      .map((key) => [key, endpointAtHostname(oidcDocument[key], hostname)])
  )
  return { ...oidcDocument, ...rewrittenEndpoints }
}

export {
  getBrowserFacingDiscoveryUrl,
  withServerSideEndpointsAtDiscoveryHostname
}
