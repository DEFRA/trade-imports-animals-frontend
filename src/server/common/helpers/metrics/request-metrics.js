import {
  countEvent,
  MILLISECONDS,
  publishMetricsInBackground
} from './publish-metrics.js'

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
 * The section a route belongs to: the first literal segment after its first
 * path parameter, else its last literal segment before it, `root` for `/` and
 * `unmatched` for a route that is all parameters.
 *
 * @param {string} routePath - the matched route's path template
 * @returns {string} the section
 */
export const routeSection = (routePath) => {
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
 * joined with `/`, else its section.
 *
 * @param {string} routePath - the matched route's path template
 * @returns {string} the page
 */
export const routePage = (routePath) => {
  const afterParameter = literalSegments(splitRoutePath(routePath).after)
  return afterParameter.length > 0
    ? afterParameter.join('/')
    : routeSection(routePath)
}

const STATUS_CODES_PER_CLASS = 100

const statusClassOf = (statusCode) =>
  `${Math.floor(statusCode / STATUS_CODES_PER_CLASS)}xx`

const isRefusedAnswer = (request) =>
  request.method === 'post' &&
  request.response?.variety === 'view' &&
  Boolean(request.response.source?.context?.errorSummary)

/**
 * Publishes a finished request as `http.server.requests` (its time from
 * received to completed, tagged `method`, `section` and `status.class`) and,
 * for a posted answer the page showed again with an error summary, counts
 * `journey.validation.failure` tagged `page`.
 *
 * @param {import('@hapi/hapi').Request} request - the finished request
 */
export const recordRequestInBackground = (request) => {
  const routePath = request.route.path
  publishMetricsInBackground(
    {
      method: request.method.toUpperCase(),
      section: routeSection(routePath),
      'status.class': statusClassOf(request.response?.statusCode ?? 0)
    },
    [
      {
        name: 'http.server.requests',
        value: request.info.completed - request.info.received,
        unit: MILLISECONDS
      }
    ]
  )
  if (isRefusedAnswer(request)) {
    countEvent('journey.validation.failure', { page: routePage(routePath) })
  }
}
