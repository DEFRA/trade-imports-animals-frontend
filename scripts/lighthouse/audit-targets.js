import { allRoutes } from '../../src/server/app/sets/live-animals/journeys/linear/features/index.js'
import { PARTIES } from '../../src/server/app/sets/live-animals/journeys/linear/features/addresses/parties.js'

const JOURNEY_PARAM = '{journeyId}'
const OTHER_PARAM = /\{(?!journeyId})[^}]+}/
const NOT_FILENAME_SAFE = /[^a-z0-9]+/gi
const DEFAULT_SHAPE = 'draft'
const ROOT_REPORT_NAME = 'home'

export const TARGETS_FILE = new URL(
  '../../.lighthouse/targets.json',
  import.meta.url
)

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

/** Routes whose answers live on a seeded notification other than the draft —
 * either because the page only exists once the notification is submitted, or
 * because the obligation behind it is out of scope on the draft's shape.
 * Everything else is audited on the draft. */
export const FILLED_BY = new Map([
  ['/notifications/{journeyId}/confirmation', 'submitted'],
  ['/notifications/{journeyId}/destination-country', 'transit'],
  ['/notifications/{journeyId}/port-of-exit', 'transit'],
  ['/notifications/{journeyId}/transporters/private', 'transit'],
  ['/notifications/{journeyId}/exit-date', 'temporaryAdmission']
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
  assertStillRouted(paths, FILLED_BY.keys(), 'filled-by list')
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

const journeyIdFor = (journeyIds, path) => {
  const shape = FILLED_BY.get(path) ?? DEFAULT_SHAPE
  const journeyId = journeyIds[shape]
  if (!journeyId) {
    throw new Error(
      `Lighthouse audits ${path} on the "${shape}" notification, which the setup step did not seed`
    )
  }
  return journeyId
}

export const auditPaths = (journeyIds, routes = allRoutes) => {
  assertTargetsAreCurrent(routes)
  return getPathsOf(routes)
    .filter((path) => !SKIPPED.has(path))
    .map(
      (path) =>
        `${path.replace(JOURNEY_PARAM, journeyIdFor(journeyIds, path))}${QUERY.get(path) ?? ''}`
    )
}

export const auditUrls = (origin, journeyIds, routes = allRoutes) =>
  auditPaths(journeyIds, routes).map((path) => new URL(path, origin).toString())

/** The report filename a URL earns, with the seeded journey id dropped so the
 * name is the page's route and nothing else. Reports then overwrite their
 * predecessor instead of piling up a fresh set on every run. */
export const reportName = (url, journeyIds) => {
  const seeded = new Set(Object.values(journeyIds))
  const name = new URL(url).pathname
    .split('/')
    .filter((segment) => segment !== '' && !seeded.has(segment))
    .join('_')
    .replace(NOT_FILENAME_SAFE, '_')
  return name === '' ? ROOT_REPORT_NAME : name
}

export const reportNames = (urls, journeyIds) => {
  const taken = new Map()
  const names = {}
  for (const url of urls) {
    const name = reportName(url, journeyIds)
    if (taken.has(name)) {
      throw new Error(
        `Lighthouse would write both ${taken.get(name)} and ${url} to ${name}.report.html — ` +
          'one of the two routes needs a path the other does not share'
      )
    }
    taken.set(name, url)
    names[url] = name
  }
  return names
}
