import { config } from '../config/config.js'

async function getSignOutUrl(_request, _token) {
  const oidcBaseUrl = new URL(config.get('defraId.oidcDiscoveryUrl'))
  const rewriteEnabled = config.get('defraId.signOutHostnameRewrite.enabled')
  const rewriteHosts = new Set(
    config.get('defraId.signOutHostnameRewrite.from')
  )
  const rewriteTarget = config.get('defraId.signOutHostnameRewrite.to')

  if (rewriteEnabled && rewriteHosts.has(oidcBaseUrl.hostname)) {
    oidcBaseUrl.hostname = rewriteTarget
  }

  const basePath = oidcBaseUrl.pathname.replace(
    '/.well-known/openid-configuration',
    ''
  )
  const signOutUrl = new URL(`${oidcBaseUrl.origin}${basePath}/signout`)
  signOutUrl.searchParams.set(
    'post_logout_redirect_uri',
    config.get('defraId.signOutRedirectUrl')
  )
  return signOutUrl.toString()
}

export { getSignOutUrl }
