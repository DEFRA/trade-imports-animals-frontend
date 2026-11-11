import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { config } from '../../../config/config.js'
import { startStubModeServer } from '../../common/test-helpers/stub-mode-server.js'
import { pageRouteOptions } from '../shared/kit.js'
import { additionalDetailsPage } from '../sets/live-animals/journeys/linear/features/additional-details/page.js'
import { consignmentDetailsPage } from '../sets/live-animals/journeys/linear/features/commodities/page.js'
import { dashboardPage } from '../sets/live-animals/journeys/linear/features/dashboard/page.js'
import { documentsPage } from '../sets/live-animals/journeys/linear/features/documents/page.js'
import { importReasonPage } from '../sets/live-animals/journeys/linear/features/import-reason/page.js'
import { originPage } from '../sets/live-animals/journeys/linear/features/origin/page.js'
import {
  commercialTransporterDetailsPage,
  portOfEntryPage,
  privateTransporterDetailsPage,
  transitCountriesPage,
  transporterAddPage,
  transportersPage
} from '../sets/live-animals/journeys/linear/features/transport/page.js'
import { SET_BASE } from '../sets/live-animals/set.js'
import { copy } from './copy/copy.en.js'
import { BANNER_CLASSES, LEVELS, TAG_CLASSES } from './levels.js'
import { pageLevelFor, pageMaturityContext } from './page-maturity.js'

const ENABLED_KEY = 'pageMaturityBanner.enabled'
const originalEnabled = config.get(ENABLED_KEY)

const requestFor = (page, response) => ({
  route: { settings: pageRouteOptions(page) },
  ...(response && { response })
})

describe('pageLevelFor', () => {
  it.each(Object.values(LEVELS))(
    'Should give a page the %s level its page.js sets',
    (level) => {
      expect(pageLevelFor({ id: 'example', maturity: level })).toBe(level)
    }
  )

  it('Should make a page that sets no level Exploring', () => {
    expect(pageLevelFor({ id: 'example', slug: 'example' })).toBe(
      LEVELS.exploring
    )
  })

  it('Should return undefined when there is no page', () => {
    expect(pageLevelFor(undefined)).toBeUndefined()
  })
})

describe('pageMaturityContext', () => {
  afterEach(() => {
    config.set(ENABLED_KEY, originalEnabled)
  })

  it('Should default the switch to on', () => {
    expect(config.default(ENABLED_KEY)).toBe(true)
  })

  it('Should return the tag, class, line and hidden prefix for the level the route page sets', () => {
    expect(
      pageMaturityContext(
        requestFor({ id: 'example', maturity: LEVELS.detailing })
      )
    ).toEqual({
      pageMaturity: {
        tag: {
          text: copy.levels.detailing.tag,
          classes: TAG_CLASSES.detailing
        },
        text: copy.levels.detailing.text,
        classes: BANNER_CLASSES.detailing,
        hiddenPrefix: copy.hiddenPrefix
      }
    })
  })

  it('Should show Exploring for a route page that sets no level', () => {
    expect(
      pageMaturityContext(requestFor({ id: 'example' })).pageMaturity
    ).toEqual(expect.objectContaining({ classes: BANNER_CLASSES.exploring }))
  })

  it('Should return nothing for a route that carries no page', () => {
    expect(
      pageMaturityContext({ route: { settings: { auth: 'session' } } })
    ).toEqual({})
  })

  it('Should return nothing when the switch is off', () => {
    config.set(ENABLED_KEY, false)

    expect(pageMaturityContext(requestFor(originPage))).toEqual({})
  })

  it('Should return nothing when the error page is rendered on a route with a page', () => {
    expect(
      pageMaturityContext(
        requestFor(originPage, { source: { template: 'shared/error' } })
      )
    ).toEqual({})
  })

  it('Should return nothing for a request with no route', () => {
    expect(pageMaturityContext({ path: SET_BASE })).toEqual({})
  })
})

describe('page maturity of the registered routes', () => {
  const NOTIFICATIONS = `${SET_BASE}/notifications`
  let routes
  let stopServer

  beforeAll(async () => {
    let server
    ;({ server, stop: stopServer } = await startStubModeServer())
    routes = server.table()
  })

  afterAll(async () => {
    await stopServer()
  })

  const routeAt = (method, path) =>
    routes.find((route) => route.method === method && route.path === path)

  const levelOf = (route) => pageLevelFor(route.settings.app?.page)

  it('Should make the live animals start page Exploring', () => {
    const start = routeAt('get', SET_BASE)

    expect(start.settings.app.page).toEqual(dashboardPage)
    expect(levelOf(start)).toBe(LEVELS.exploring)
  })

  it('Should take a journey page level from its feature page.js', () => {
    const origin = routeAt('get', `${NOTIFICATIONS}/{journeyId}/origin`)

    expect(origin.settings.app.page).toEqual(originPage)
    expect(levelOf(origin)).toBe(originPage.maturity)
  })

  it('Should make the agreed pages Agreed and every other notification journey route Detailing', () => {
    const agreedPageIds = new Set(
      [
        originPage,
        importReasonPage,
        consignmentDetailsPage,
        additionalDetailsPage,
        portOfEntryPage,
        transitCountriesPage,
        transportersPage,
        transporterAddPage,
        commercialTransporterDetailsPage,
        privateTransporterDetailsPage,
        documentsPage
      ].map(({ id }) => id)
    )
    const journeyRoutes = routes.filter(
      ({ path }) =>
        path === NOTIFICATIONS || path.startsWith(`${NOTIFICATIONS}/`)
    )
    const expectedLevelOf = (route) =>
      agreedPageIds.has(route.settings.app?.page?.id)
        ? LEVELS.agreed
        : LEVELS.detailing

    expect(
      new Set(
        journeyRoutes
          .filter((route) => levelOf(route) === LEVELS.agreed)
          .map((route) => route.settings.app.page.id)
      )
    ).toEqual(agreedPageIds)
    for (const route of journeyRoutes) {
      expect(levelOf(route), `${route.method} ${route.path}`).toBe(
        expectedLevelOf(route)
      )
    }
  })

  it('Should give every route page a known level', () => {
    const levels = routes
      .map((route) => route.settings.app?.page)
      .filter(Boolean)
      .map(pageLevelFor)

    expect(levels.length).toBeGreaterThan(0)
    for (const level of levels) {
      expect(Object.values(LEVELS)).toContain(level)
    }
  })

  it.each(['/health', '/auth/sign-out', `${SET_BASE}/start`])(
    'Should give %s no level',
    (path) => {
      expect(levelOf(routeAt('get', path))).toBeUndefined()
    }
  )
})
