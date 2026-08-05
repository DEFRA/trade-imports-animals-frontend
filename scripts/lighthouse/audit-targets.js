import { allRoutes } from '../../src/server/app/sets/live-animals/journeys/linear/features/index.js'
import { PARTIES } from '../../src/server/app/sets/live-animals/journeys/linear/features/addresses/parties.js'

const JOURNEY_PARAM = '{journeyId}'
const OTHER_PARAM = /\{(?!journeyId})[^}]+}/

/** GET routes Lighthouse deliberately does not audit. Every entry is checked
 * against the live route table, so a stale reason fails the build rather than
 * quietly shrinking the audit. */
export const SKIPPED = new Map([
  [
    '/notifications/{journeyId}/accompanying-documents/status',
    'upload-scan polling endpoint — JSON, not a page'
  ],
  [
    '/notifications/{journeyId}/accompanying-documents/{uploadId}/file',
    'file download — needs an uploadId that only a real upload produces'
  ],
  [
    '/notifications/{journeyId}/cancel-amend',
    'amend lifecycle — only reachable on a notification put into amend, and the page exists only to confirm a destructive POST'
  ],
  [
    '/notifications/{journeyId}/delete',
    'delete lifecycle — the page exists only to confirm a destructive POST'
  ]
])

/** Routes that render their own page only once the notification is submitted. */
export const SUBMITTED_ONLY = new Set([
  '/notifications/{journeyId}/confirmation'
])

/** Query strings a route needs before it will render rather than redirect. */
export const QUERY = new Map([
  ['/notifications/{journeyId}/addresses/create', `?for=${PARTIES[0].id}`]
])

const getPathsOf = (routes) =>
  routes.filter(({ method }) => method === 'GET').map(({ path }) => path)

const assertStillRouted = (paths, listed, label) => {
  for (const path of listed) {
    if (!paths.includes(path)) {
      throw new Error(
        `Lighthouse ${label} names ${path}, which the app no longer serves as a GET route`
      )
    }
  }
}

export const assertTargetsAreCurrent = (routes = allRoutes) => {
  const paths = getPathsOf(routes)
  assertStillRouted(paths, SKIPPED.keys(), 'skip list')
  assertStillRouted(paths, SUBMITTED_ONLY, 'submitted-only list')
  assertStillRouted(paths, QUERY.keys(), 'query list')

  const unsatisfiable = paths.filter(
    (path) => !SKIPPED.has(path) && OTHER_PARAM.test(path)
  )
  if (unsatisfiable.length > 0) {
    throw new Error(
      `Lighthouse cannot build a URL for ${unsatisfiable.join(', ')} — satisfy the ` +
        'extra path parameter or add the route to SKIPPED with a reason'
    )
  }
}

export const auditPaths = (
  { draftJourneyId, submittedJourneyId },
  routes = allRoutes
) => {
  assertTargetsAreCurrent(routes)
  return getPathsOf(routes)
    .filter((path) => !SKIPPED.has(path))
    .map((path) => {
      const journeyId = SUBMITTED_ONLY.has(path)
        ? submittedJourneyId
        : draftJourneyId
      return `${path.replace(JOURNEY_PARAM, journeyId)}${QUERY.get(path) ?? ''}`
    })
}

export const auditUrls = (origin, journeyIds, routes = allRoutes) =>
  auditPaths(journeyIds, routes).map((path) => new URL(path, origin).toString())
