import Hapi from '@hapi/hapi'
import { describe, expect, it } from 'vitest'
import { BASE } from './journey/index.js'
import { obligationsSpike, routeTable } from './routes.js'

/**
 * Pins the assembled route table: the exact URL surface (cookie-carried
 * journeyId — no {id} segment anywhere), auth-free options, and the
 * guard's surface metadata on every journey route. The raw table stays
 * pre-handler-free; withGuard wraps at registration (Step 11.6 landed),
 * so every surface-carrying route registers guarded.
 */

const table = routeTable()
const relative = (path) => path.slice(BASE.length) || '(base)'
const pathsOf = (method) =>
  table
    .filter((route) => route.method === method)
    .map((route) => relative(route.path))
    .sort()

const PAGE_SLUGS = [
  '/email',
  '/about-you',
  '/your-vehicle',
  '/driving-history',
  '/cover-type',
  '/optional-extras',
  '/addons',
  '/addons/named-driver/who',
  '/addons/named-driver/relationship',
  '/addons/modifications/describe',
  '/addons/modifications/value',
  '/addons/protected-ncd/years'
]

describe('routes — the flat route table', () => {
  it('pins the GET surface', () => {
    expect(pathsOf('GET')).toEqual(
      [
        '(base)',
        '/hub',
        ...PAGE_SLUGS,
        '/addons/{rest*}',
        '/claims',
        '/claims/add',
        '/claims/{index}/remove',
        '/quote-summary',
        '/check-your-answers',
        '/confirmation',
        '/model/obligations.json',
        '/model/flow.json'
      ].sort()
    )
  })

  it('pins the POST surface (no POST confirmation)', () => {
    expect(pathsOf('POST')).toEqual(
      [
        '/start',
        ...PAGE_SLUGS,
        '/claims',
        '/claims/add',
        '/quote-summary',
        '/check-your-answers'
      ].sort()
    )
  })

  it('carries no {id} path segment — the journeyId rides in the cookie', () => {
    expect(table.every((route) => !route.path.includes('{id}'))).toBe(true)
  })

  it('is auth-free throughout; the raw table carries no pre-handlers', () => {
    for (const route of table) {
      expect(route.options.auth).toBe(false)
      expect(route.options.pre).toBeUndefined()
    }
  })

  it('carries guard surface metadata on every journey route', () => {
    const modelPaths = table.filter((route) => route.path.includes('/model/'))
    const journeyRoutes = table.filter(
      (route) => !route.path.includes('/model/')
    )
    expect(modelPaths).toHaveLength(2)
    for (const route of modelPaths) {
      expect(route.options.app).toBeUndefined()
    }
    for (const route of journeyRoutes) {
      expect(route.options.app.surface).toMatch(
        /^(start|hub|page|quote-summary|check-your-answers|confirmation)$/
      )
    }
  })

  it('maps the ending surfaces onto their guard names', () => {
    const surfaceOf = (method, suffix) =>
      table.find(
        (route) => route.method === method && route.path === `${BASE}${suffix}`
      ).options.app.surface
    expect(surfaceOf('GET', '/quote-summary')).toBe('quote-summary')
    expect(surfaceOf('POST', '/check-your-answers')).toBe('check-your-answers')
    expect(surfaceOf('GET', '/confirmation')).toBe('confirmation')
    expect(surfaceOf('GET', '/claims')).toBe('page')
  })

  it('registers as one Hapi plugin exposing every table route', async () => {
    const server = Hapi.server()
    await server.register(obligationsSpike)
    expect(server.table()).toHaveLength(table.length)
    await server.stop()
  })

  it('registers every surface-carrying route wrapped in the guard (Step 11.6)', async () => {
    const server = Hapi.server()
    await server.register(obligationsSpike)
    for (const route of server.table()) {
      const guarded = (route.settings.pre ?? []).length > 0
      expect(guarded).toBe(Boolean(route.settings.app?.surface))
    }
    await server.stop()
  })
})
