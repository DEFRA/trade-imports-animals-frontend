import { config } from '../../../../config/config.js'
import { callCountsOf } from '../call-counts/call-counts.js'
import { createLogger } from '../logging/logger.js'
import { isPageRequest } from '../call-counts/call-count-totals.js'
import { recordPageRequestInBackground } from './page-request-metrics.js'
import {
  countEventInBackground,
  MILLISECONDS,
  publishMetricsInBackground
} from './publish-metrics.js'

const logger = createLogger()

const isPathParameter = (segment) => segment.startsWith('{')

const literalSegments = (segments) =>
  segments.filter((segment) => !isPathParameter(segment))

const splitRoutePath = (routePath) => {
  const segments = routePath.split('/').filter(Boolean)
  const firstParameter = segments.findIndex(isPathParameter)
  return firstParameter === -1
    ? { before: segments, after: [] }
    : {
        before: segments.slice(0, firstParameter),
        after: segments.slice(firstParameter + 1)
      }
}

/**
 * The area a route belongs to: the first literal segment after its first
 * path parameter, else its last literal segment before it, `root` for `/` and
 * `unmatched` for a route that is all parameters.
 *
 * @param {string} routePath - the matched route's path template
 * @returns {string} the area
 */
export const routeArea = (routePath) => {
  if (routePath === '/') {
    return 'root'
  }
  const { before, after } = splitRoutePath(routePath)
  return (
    literalSegments(after)[0] ?? literalSegments(before).at(-1) ?? 'unmatched'
  )
}

/**
 * The page a route shows: the literal segments after its first path parameter,
 * joined with `/`, else its area.
 *
 * @param {string} routePath - the matched route's path template
 * @returns {string} the page
 */
export const routePage = (routePath) => {
  const afterParameter = literalSegments(splitRoutePath(routePath).after)
  return afterParameter.length > 0
    ? afterParameter.join('/')
    : routeArea(routePath)
}

const statusClassOf = (statusCode) => {
  const statusCodesPerClass = 100
  return `${Math.floor(statusCode / statusCodesPerClass)}xx`
}

const statusCodeOf = (request) =>
  request.response?.statusCode ??
  request.response?.output?.statusCode ??
  request.raw.res.statusCode

const isValidationFailure = (request) =>
  request.method === 'post' &&
  request.response?.variety === 'view' &&
  Boolean(request.response.source?.context?.errorSummary)

const recordRequestTimeInBackground = (request) =>
  publishMetricsInBackground(
    {
      method: request.method.toUpperCase(),
      area: routeArea(request.route.path),
      'status.class': statusClassOf(statusCodeOf(request))
    },
    [
      {
        name: 'http.server.requests',
        value: request.info.completed - request.info.received,
        unit: MILLISECONDS
      }
    ]
  )

const countValidationFailureInBackground = (request) => {
  if (isValidationFailure(request)) {
    countEventInBackground('journey.validation.failure', {
      page: routePage(request.route.path)
    })
  }
}

const finishedPageRequestListener =
  ({ publishesCallCounts }) =>
  (request) => {
    if (!isPageRequest(request.route.path)) {
      return
    }
    recordRequestTimeInBackground(request)
    countValidationFailureInBackground(request)
    const counts = callCountsOf(request)
    if (counts && publishesCallCounts) {
      recordPageRequestInBackground(counts)
    }
  }

/**
 * Publishes, without making the request wait, every finished page request as
 * `http.server.requests` (its time from received to completed, tagged
 * `method`, `area` and `status.class`); for a posted answer the page showed
 * again with an error summary, a `journey.validation.failure` count tagged
 * `page`; and, when `callCounts.metrics.enabled` is on at registration, the
 * request's call counts. Logs at registration whether it publishes call counts.
 */
export const requestMetrics = {
  plugin: {
    name: 'request-metrics',
    dependencies: 'call-counts',
    register(server) {
      const publishesCallCounts = config.get('callCounts.metrics.enabled')
      logger.info(
        { callCountsMetricsEnabled: publishesCallCounts },
        'Request metrics registered'
      )
      server.events.on(
        'response',
        finishedPageRequestListener({ publishesCallCounts })
      )
    }
  }
}
