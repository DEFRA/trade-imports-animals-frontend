import { config } from '../config/config.js'

async function getSignOutUrl(_request, _token) {
  const oidcBaseUrl = new URL(config.get('defraId.oidcDiscoveryUrl'))
  const basePath = oidcBaseUrl.pathname.replace(
    '/.well-known/openid-configuration',
    ''
  )
  const base = `${oidcBaseUrl.origin}${basePath}`
  return `${base}/signout`
}

export { getSignOutUrl }
