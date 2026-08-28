import path from 'node:path'
import { readFileSync } from 'node:fs'

import { config } from '../../config.js'
import { createLogger } from '../../../server/common/helpers/logging/logger.js'
import { inDashboardSection } from '../../../server/app/shared/paths.js'

const logger = createLogger()
const assetPath = config.get('assetPath')
const manifestPath = path.join(
  config.get('root'),
  '.public/assets-manifest.json'
)

let webpackManifest

/**
 * Which service-navigation item the current request sits under, so the layout
 * can mark it active. Section-wide, not page-wide: every notification page is
 * inside the dashboard's section of the service, which is why the answer for
 * `/notifications/123/origin` is still `dashboard`.
 *
 * @param {string} [requestPath] - the request path.
 * @returns {string|null} the id of the active navigation item, or null when the
 * request is under none of them.
 */
export function activeNavigationItem(requestPath = '') {
  return inDashboardSection(requestPath) ? 'dashboard' : null
}

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
    staleActionRejected: request.query?.staleAction === '1',
    activeNavigationItem: activeNavigationItem(request.path),
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
