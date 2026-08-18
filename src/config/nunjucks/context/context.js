import path from 'node:path'
import { readFileSync } from 'node:fs'

import { config } from '../../config.js'
import { createLogger } from '../../../server/common/helpers/logging/logger.js'

const logger = createLogger()
const assetPath = config.get('assetPath')
const manifestPath = path.join(
  config.get('root'),
  '.public/assets-manifest.json'
)

let webpackManifest

async function context(request) {
  if (!webpackManifest) {
    try {
      webpackManifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
    } catch (error) {
      logger.error(`Webpack ${path.basename(manifestPath)} not found`)
    }
  }

  // If the user is authenticated, add the user's details to the view context
  // This allows the view to display the user's session details and the ability to conditionally render content
  const authData = request.auth?.isAuthenticated
    ? await request.server.app.cache.get(request.auth.credentials.sessionId)
    : null

  return {
    assetPath: `${assetPath}/assets`,
    serviceName: config.get('serviceName'),
    serviceUrl: '/',
    authEnabled: config.get('auth.enabled'),
    // Set by kit.js's staleTokenRedirect wrapper — the POST hit a 409
    // STALE_CONCURRENCY_TOKEN, the browser was redirected back to this GET
    // with `?staleToken=1`, and the shared layout renders a notification
    // banner so the user knows their in-flight edit was discarded.
    staleTokenBanner: request.query?.staleToken === '1',
    breadcrumbs: [],
    userSession: authData
      ? {
          isAuthenticated: true,
          displayName: authData.displayName || authData.email || 'User',
          email: authData.email
        }
      : {
          isAuthenticated: false
        },
    getAssetPath(asset) {
      const webpackAssetPath = webpackManifest?.[asset]
      return `${assetPath}/${webpackAssetPath ?? asset}`
    }
  }
}

export { context }
