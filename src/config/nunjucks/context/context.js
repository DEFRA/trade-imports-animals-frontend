import path from 'node:path'
import { readFileSync } from 'node:fs'

import { config } from '../../config.js'
import { createLogger } from '../../../server/common/helpers/logging/logger.js'
import {
  dashboardPath,
  inDashboardSection
} from '../../../server/app/shared/paths.js'
import {
  hasSetContext,
  setIdForPath,
  withSetContext
} from '../../../server/app/shared/set-context.js'
import { countSessionResolution } from '../../../server/common/helpers/call-counts/call-counts.js'
import { insAddressBookUrl } from '../../../server/common/helpers/ins-address-book-urls.js'
import { pageMaturityContext } from '../../../server/app/page-maturity/page-maturity.js'

const logger = createLogger()
const assetPath = config.get('assetPath')
const manifestPath = path.join(
  config.get('root'),
  '.public/assets-manifest.json'
)

let webpackManifest

/**
 * The service-navigation item a request path sits under. Section-wide: any
 * path inside the dashboard's section, a notification's pages included, is
 * `dashboard`.
 *
 * @param {string} [requestPath] - the request path.
 * @returns {string|null} the id of the active navigation item, or null outside a
 * set context or when the path is under none of them.
 */
export function activeNavigationItem(requestPath = '') {
  if (!hasSetContext()) {
    return null
  }
  return inDashboardSection(requestPath) ? 'dashboard' : null
}

const resolveSession = (request, sessionId) => {
  countSessionResolution(request)
  return request.server.app.cache.get(sessionId)
}

async function context(request) {
  if (!webpackManifest) {
    try {
      webpackManifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
    } catch (error) {
      logger.error(
        { err: error },
        `Webpack ${path.basename(manifestPath)} not found`
      )
    }
  }

  const sessionId = request.auth?.credentials?.sessionId
  const authData = sessionId ? await resolveSession(request, sessionId) : null

  const setId = setIdForPath(request.path)

  return {
    assetPath: `${assetPath}/assets`,
    serviceName: config.get('serviceName'),
    serviceUrl: '/',
    authEnabled: config.get('auth.enabled'),
    staleActionRejected: request.query?.staleAction === '1',
    homeUrl: setId ? withSetContext(setId, dashboardPath) : '/',
    activeNavigationItem: setId
      ? withSetContext(setId, () => activeNavigationItem(request.path))
      : null,
    addressBookUrl: insAddressBookUrl(),
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
    },
    ...pageMaturityContext(request)
  }
}

export { context }
