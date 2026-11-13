import {
  dashboardPath,
  dashboardRoutePath,
  setBase
} from '../../src/server/app/shared/paths.js'
import { registerSetMount } from '../../src/server/app/shared/set-context.js'
import { SET_BASE, SET_ID } from '../../src/server/app/sets/live-animals/set.js'
import { allRoutes } from '../../src/server/app/sets/live-animals/journeys/linear/features/index.js'

registerSetMount(SET_ID, SET_BASE)

const JOURNEY_PARAM = '{journeyId}'
const OTHER_PARAM = /\{(?!journeyId})[^}]+}/
const NOT_FILENAME_SAFE = /[^a-z0-9]+/gi
const DEFAULT_SHAPE = 'draft'
const ROOT_REPORT_NAME = 'home'

export const TARGETS_FILE = new URL(
  '../../.lighthouse/targets.json',
  import.meta.url
)

/** GET routes Lighthouse does not audit, each with its reason. Every entry is
 * checked against the live route table. */
export const SKIPPED = new Map([
  ['/start', 'creates a draft and redirects, not a page'],
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
  ],
  [
    '/notifications/{journeyId}/address-return',
    'INS handshake return endpoint — redirects to the party picker, not a page'
  ],
  [
    '/notifications/{journeyId}/permanent-address',
    'only renders for a line whose species needs a permanent address — every seeded shape is a cattle consignment, which never does'
  ],
  [
    '/notifications/{journeyId}/declaration',
    'reached only by posting the review’s Continue — a GET redirects to the review; declaration.fit.spec.js audits the page with axe'
  ]
])

/** Routes audited on a seeded notification other than the draft, keyed to the
 * seeded shape each one needs. */
export const FILLED_BY = new Map([
  ['/notifications/{journeyId}/confirmation', 'submitted'],
  ['/notifications/{journeyId}/transporters/add/private', 'transit']
])

/** Query strings a route needs before it renders rather than redirects. */
export const QUERY = new Map()

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

const linkUnderMount = (routeShape) =>
  routeShape === dashboardRoutePath()
    ? dashboardPath()
    : `${setBase()}${routeShape}`

/** The set-mounted paths Lighthouse audits, one per audited GET route. */
export const auditPaths = (journeyIds, routes = allRoutes) => {
  assertTargetsAreCurrent(routes)
  return getPathsOf(routes)
    .filter((path) => !SKIPPED.has(path))
    .map((path) => {
      const resolved = path.includes(JOURNEY_PARAM)
        ? path.replace(JOURNEY_PARAM, journeyIdFor(journeyIds, path))
        : path
      return `${linkUnderMount(resolved)}${QUERY.get(path) ?? ''}`
    })
}

export const auditUrls = (origin, journeyIds, routes = allRoutes) =>
  auditPaths(journeyIds, routes).map((path) => new URL(path, origin).toString())

/** The URLs runner `index` of `total` audits. The shards are contiguous,
 * near-equal slices that together hold every URL once, in order. */
export const urlsInShard = (urls, { index, total }) => {
  if (
    !Number.isInteger(total) ||
    !Number.isInteger(index) ||
    index < 1 ||
    index > total
  ) {
    throw new Error(
      `Lighthouse shard ${index} of ${total} is not a runner between 1 and the total`
    )
  }
  const size = Math.ceil(urls.length / total)
  return urls.slice((index - 1) * size, index * size)
}

const withoutMount = (pathname) => {
  const base = setBase()
  return pathname.startsWith(base) ? pathname.slice(base.length) : pathname
}

/** The report filename a URL earns: its route with the set's mount prefix and
 * the seeded journey id dropped. */
export const reportName = (url, journeyIds) => {
  const seeded = new Set(Object.values(journeyIds))
  const name = withoutMount(new URL(url).pathname)
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
