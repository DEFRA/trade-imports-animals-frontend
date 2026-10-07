import { config } from '../../../../config/config.js'

const EXCLUDED_ROUTE_PATHS = new Set([
  '/health',
  '/favicon.ico',
  '/call-counts',
  `${config.get('assetPath')}/{param*}`
])

const routeTotals = new Map()
let since = new Date().toISOString()

const emptyTotals = () => ({
  pageRequests: 0,
  backendCalls: 0,
  sessionResolutions: 0,
  externalCalls: {}
})

/**
 * Says whether a route's requests count as page requests.
 *
 * @param {string} routePath - the matched route's path
 * @returns {boolean} false for health, favicon, static assets and the call counts endpoint
 */
export const isPageRequest = (routePath) => !EXCLUDED_ROUTE_PATHS.has(routePath)

const mergeOperations = (existing, added) =>
  Object.entries(added).reduce(
    (merged, [operation, calls]) => ({
      ...merged,
      [operation]: (merged[operation] ?? 0) + calls
    }),
    existing
  )

const mergeExternalCalls = (existing, added) =>
  Object.entries(added).reduce(
    (merged, [dependency, operations]) => ({
      ...merged,
      [dependency]: mergeOperations(merged[dependency] ?? {}, operations)
    }),
    existing
  )

const sumRoutes = (routes) =>
  routes.reduce(
    (sum, route) => ({
      pageRequests: sum.pageRequests + route.pageRequests,
      backendCalls: sum.backendCalls + route.backendCalls,
      sessionResolutions: sum.sessionResolutions + route.sessionResolutions,
      externalCalls: mergeExternalCalls(sum.externalCalls, route.externalCalls)
    }),
    emptyTotals()
  )

const byPathThenMethod = (first, second) =>
  first.path.localeCompare(second.path) ||
  first.method.localeCompare(second.method)

/**
 * Adds one finished page request to its route's running totals.
 *
 * @param {{ method: string, path: string, counts: { backendCalls: number, sessionResolutions: number, externalCalls: Record<string, Record<string, number>> } }} pageRequest - the request's route and counts
 */
export const addPageRequest = ({ method, path, counts }) => {
  const key = `${method} ${path}`
  const existing = routeTotals.get(key) ?? { method, path, ...emptyTotals() }
  routeTotals.set(key, {
    ...existing,
    pageRequests: existing.pageRequests + 1,
    backendCalls: existing.backendCalls + counts.backendCalls,
    sessionResolutions: existing.sessionResolutions + counts.sessionResolutions,
    externalCalls: mergeExternalCalls(
      existing.externalCalls,
      counts.externalCalls
    )
  })
}

/**
 * Reads the running totals for the whole service and for each route.
 *
 * @returns {{ service: string, since: string, totals: object, routes: object[] }} the totals since start or the last clear
 */
export const callCountTotals = () => {
  const routes = [...routeTotals.values()].sort(byPathThenMethod)
  return {
    service: config.get('metrics.namespace'),
    since,
    totals: sumRoutes(routes),
    routes
  }
}

/** Empties the running totals and restarts the `since` time. */
export const clearCallCountTotals = () => {
  routeTotals.clear()
  since = new Date().toISOString()
}
