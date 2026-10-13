import path from 'node:path'
import { readFileSync } from 'node:fs'

import { config } from '../../config.js'
import { createLogger } from '../../../server/common/helpers/logging/logger.js'
import {
  dashboardPath,
  inDashboardSection,
  inTemplatesSection,
  templatesRoutePath
} from '../../../server/app/shared/paths.js'
import { SET_BASE as LIVE_ANIMALS_SET_BASE } from '../../../server/app/sets/live-animals/set.js'
import {
  hasSetContext,
  setIdForPath,
  withSetContext
} from '../../../server/app/shared/set-context.js'
import { countSessionResolution } from '../../../server/common/helpers/call-counts/call-counts.js'
import { pageMaturityContext } from '../../../server/app/page-maturity/page-maturity.js'

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
 * `/notifications/123/origin` is still `dashboard`. Likewise `templates` for
 * Manage templates and every page under it.
 *
 * @param {string} [requestPath] - the request path.
 * @returns {string|null} `dashboard`, `templates`, or null when the request is
 * under none of them.
 */
export function activeNavigationItem(requestPath = '') {
  if (!hasSetContext()) {
    return null
  }
  if (inDashboardSection(requestPath)) {
    return 'dashboard'
  }
  if (inTemplatesSection(requestPath)) {
    return 'templates'
  }
  return null
}

const resolveSession = (request, sessionId) => {
  countSessionResolution(request)
  return request.server.app.cache.get(sessionId)
}

const insAddressBookUrl = () =>
  `${config.get('tradeImportsInsFrontend.baseUrl').replace(/\/$/, '')}/address-book`

/**
 * The Manage templates link. Manage templates is served by the live-animals set
 * only, so every page links to that one, whichever set (or none) the request is in.
 *
 * @returns {string} the same-origin path of Manage templates.
 */
const templatesUrl = () => `${LIVE_ANIMALS_SET_BASE}${templatesRoutePath()}`

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
  const sessionId = request.auth?.credentials?.sessionId
  const authData = sessionId ? await resolveSession(request, sessionId) : null

  // Resolved from the path, not from an ambient context: hapi-vision marshals
  // the view after the handler has returned, so an `enterWith` from a set's own
  // extension may already have gone by the time this global context is built.
  const setId = setIdForPath(request.path)

  return {
    assetPath: `${assetPath}/assets`,
    serviceName: config.get('serviceName'),
    serviceUrl: '/',
    authEnabled: config.get('auth.enabled'),
    staleActionRejected: request.query?.staleAction === '1',
    // The chrome's home link for every rendered page, so a view built without
    // kit.base() — the dashboard's own, for one — still links back into its own
    // set. kit.base() supplies the same key, and a view's own context wins.
    homeUrl: setId ? withSetContext(setId, dashboardPath) : '/',
    activeNavigationItem: setId
      ? withSetContext(setId, () => activeNavigationItem(request.path))
      : null,
    templatesUrl: templatesUrl(),
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
