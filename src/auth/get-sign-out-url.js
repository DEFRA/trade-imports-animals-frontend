import { config } from '../config/config.js'
import { getBrowserFacingDiscoveryUrl } from './defra-id-hostnames.js'

async function getSignOutUrl(_request, _token) {
  const discoveryUrl = getBrowserFacingDiscoveryUrl()
  const issuerPath = discoveryUrl.pathname.replace(
    '/.well-known/openid-configuration',
    ''
  )
  const signOutUrl = new URL(`${discoveryUrl.origin}${issuerPath}/signout`)
  signOutUrl.searchParams.set(
    'post_logout_redirect_uri',
    config.get('defraId.signOutRedirectUrl')
  )
  return signOutUrl.toString()
}

export { getSignOutUrl }
