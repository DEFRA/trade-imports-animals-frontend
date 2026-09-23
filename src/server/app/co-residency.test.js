/**
 * Two obligation sets, one Node process.
 *
 * This is the suite EUDPA-619 exists to satisfy, so it boots the PRODUCTION
 * router rather than hand-rolling the composition it is meant to be checking.
 * A hand-rolled boot would assert against the test's own wiring: prefixing
 * /signout in router.js, or dropping the / redirect, would leave it green.
 *
 * The second set is a test fixture (test/fixtures/second-set.js) rather than a
 * real journey. Co-residency is a property of the platform, and shipping a
 * second real set would mean shipping a journey nobody asked for.
 */
import path from 'node:path'
import Hapi from '@hapi/hapi'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { config } from '../../config/config.js'
import { nunjucksConfig } from '../../config/nunjucks/nunjucks.js'
import { DEFAULT_SET_BASE, router } from '../router.js'
import { createServer } from '../server.js'
import { authRoutes } from '../auth/index.js'
import { mockOidcConfig } from '../common/test-helpers/mock-oidc-config.js'
import {
  currentSetId,
  enterSetContext,
  mountedSetIds,
  registerSetMount,
  setContextExtension,
  withSetContext
} from './shared/set-context.js'
import { catchAll } from '../common/helpers/errors.js'
import { obligations } from './model/obligations/manifest.js'
import { fulfilmentRegistry } from './bridge/fulfilment-registry.js'
import { journeySections } from './flow/journey-flow.js'
import { dashboardPath } from './shared/paths.js'
import {
  SET_BASE as LIVE_ANIMALS_BASE,
  SET_ID as LIVE_ANIMALS
} from './sets/live-animals/set.js'
import { SESSION_COOKIE_NAMES as LIVE_ANIMALS_COOKIES } from './sets/live-animals/journeys/linear/config.js'
import {
  FEATURE_NAME as SECOND_SET_FEATURE,
  RENDERED_ROUTE_PATH as SECOND_SET_RENDERED_PATH,
  RENDERED_TITLE as SECOND_SET_RENDERED_TITLE,
  SESSION_COOKIE_NAMES as SECOND_SET_COOKIES,
  SET_BASE as SECOND_SET_BASE,
  SET_ID as SECOND_SET,
  records as secondSetRecords,
  secondSet
} from '../../../test/fixtures/second-set.js'

vi.mock('../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

const FOREIGN_REALM = 'foreign-realm'
const FOREIGN_REALM_BASE = `/${FOREIGN_REALM}`

let foreignRealmExtensionRan = 0

/**
 * A third mounted realm whose onPreAuth counts every route it runs on. If any
 * set-owned extension were registered without `{ sandbox: 'plugin' }` it would
 * be server-wide, and this counter would tick on the other sets' routes.
 */
const foreignRealm = {
  plugin: {
    name: 'foreign-realm-probe',
    register(server) {
      registerSetMount(FOREIGN_REALM, FOREIGN_REALM_BASE)
      server.ext(
        'onPreAuth',
        (_request, h) => {
          foreignRealmExtensionRan += 1
          enterSetContext(FOREIGN_REALM)
          return h.continue
        },
        { sandbox: 'plugin' }
      )
      server.route({
        method: 'GET',
        path: `${FOREIGN_REALM_BASE}/probe`,
        options: { auth: false },
        handler: () => ({ setId: currentSetId() })
      })
    }
  }
}

/** Reads Set-Cookie the way a browser does, so a cookie's Path attribute
 * decides which requests carry it back. Scoping is the whole point here. */
const cookieJar = () => {
  const cookies = new Map()
  return {
    absorb(response) {
      for (const header of response.headers['set-cookie'] ?? []) {
        const [pair, ...attributes] = header
          .split(';')
          .map((part) => part.trim())
        const separator = pair.indexOf('=')
        const name = pair.slice(0, separator)
        const pathAttribute = attributes.find((attribute) =>
          attribute.toLowerCase().startsWith('path=')
        )
        cookies.set(name, {
          name,
          value: pair.slice(separator + 1),
          path: pathAttribute?.slice('path='.length) ?? '/'
        })
      }
    },
    namesFor(pathname) {
      return [...cookies.values()]
        .filter((cookie) => pathname.startsWith(cookie.path))
        .map(({ name }) => name)
        .sort()
    }
  }
}

let server

beforeAll(async () => {
  server = Hapi.server({
    routes: {
      files: { relativeTo: path.resolve(config.get('root'), '.public') }
    }
  })
  await server.register([nunjucksConfig, router])
  // The two server-wide extensions server.js registers, in the same order:
  // the set context resolved from the path before routing, and the shared
  // error page. Without them this server could not show what an unrouted path
  // does with two sets mounted, which is the case that 500s.
  server.ext(setContextExtension)
  server.ext('onPreResponse', catchAll)
  // Mounted the way router.js mounts live-animals. Registering a set without
  // its prefix collides with the root redirect, which is the namespace split
  // working: no set may sit at the root.
  await server.register(secondSet, { routes: { prefix: SECOND_SET_BASE } })
  await server.register(foreignRealm)
  await server.initialize()
})

afterAll(async () => {
  await server.stop({ timeout: 0 })
})

describe('co-residency — two sets mounted in one process', () => {
  it('Should mount every registered set under its own prefix', () => {
    expect(mountedSetIds()).toEqual(
      expect.arrayContaining([LIVE_ANIMALS, SECOND_SET, FOREIGN_REALM])
    )
  })

  it('Should register no set route at the root', () => {
    const rootRoutes = server
      .table()
      .filter(
        (route) =>
          !route.path.startsWith(LIVE_ANIMALS_BASE) &&
          !route.path.startsWith(SECOND_SET_BASE) &&
          !route.path.startsWith(FOREIGN_REALM_BASE)
      )
      .map((route) => route.path)

    // What is left at the root is the server-wide surface and nothing else.
    expect(rootRoutes.toSorted()).toEqual([
      '/',
      '/favicon.ico',
      '/health',
      '/public/{param*}',
      '/signout'
    ])
  })

  it('Should redirect the root to the default set rather than serving a set there', async () => {
    const response = await server.inject('/')

    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toBe(DEFAULT_SET_BASE)
    expect(DEFAULT_SET_BASE).toBe(LIVE_ANIMALS_BASE)
  })
})

describe('co-residency — each set answers with its own configuration', () => {
  it("Should resolve the second set's obligations and sections on its own route", async () => {
    const response = await server.inject(SECOND_SET_BASE)

    expect(response.statusCode).toBe(200)
    expect(response.result).toEqual({
      setId: SECOND_SET,
      dashboardPath: SECOND_SET_BASE,
      obligationNames: ['shipmentReference'],
      sectionIds: ['details']
    })
  })

  it("Should not leak the second set's configuration into live-animals", async () => {
    // Read live-animals' configuration the way a request does, then confirm it
    // is nothing like the second set's, which is mounted at the same time.
    const liveAnimalsObligations = await withSetContext(LIVE_ANIMALS, () =>
      obligations().map(({ name }) => name)
    )
    const secondSetObligations = await withSetContext(SECOND_SET, () =>
      obligations().map(({ name }) => name)
    )

    expect(secondSetObligations).toEqual(['shipmentReference'])
    expect(liveAnimalsObligations).not.toContain('shipmentReference')
    expect(liveAnimalsObligations.length).toBeGreaterThan(1)
  })

  it('Should give each set its own journey flow', async () => {
    const liveAnimalsSections = await withSetContext(LIVE_ANIMALS, () =>
      journeySections().map(({ id }) => id)
    )
    const secondSetSections = await withSetContext(SECOND_SET, () =>
      journeySections().map(({ id }) => id)
    )

    expect(secondSetSections).toEqual(['details'])
    expect(liveAnimalsSections).not.toEqual(secondSetSections)
  })

  it('Should give each set its own fulfilment registry', async () => {
    const liveAnimalsFeatures = await withSetContext(LIVE_ANIMALS, () =>
      fulfilmentRegistry.features.map(({ name }) => name)
    )
    const secondSetFeatures = await withSetContext(SECOND_SET, () =>
      fulfilmentRegistry.features.map(({ name }) => name)
    )

    expect(secondSetFeatures).toEqual([SECOND_SET_FEATURE])
    expect(liveAnimalsFeatures).toEqual([
      'system',
      'origin',
      'import-reason',
      'additional-details',
      'addresses',
      'transport',
      'contact',
      'cph-number',
      'commodities',
      'documents'
    ])
  })

  it('Should build every link inside the request’s own set', async () => {
    const liveAnimalsBase = await withSetContext(LIVE_ANIMALS, () =>
      dashboardPath()
    )
    const secondSetBase = await withSetContext(SECOND_SET, () =>
      dashboardPath()
    )

    expect(liveAnimalsBase).toBe(LIVE_ANIMALS_BASE)
    expect(secondSetBase).toBe(SECOND_SET_BASE)
  })
})

describe('co-residency — the render path resolves the request’s set', () => {
  it('Should render a second set’s view with that set’s own layout values', async () => {
    const response = await server.inject(
      `${SECOND_SET_BASE}${SECOND_SET_RENDERED_PATH}`
    )

    expect(response.statusCode).toBe(200)
    // The view is marshalled after the handler returns. These two values come
    // from the set's own configuration — its journey layout and its mount — so
    // a render that resolved the wrong set could not produce both.
    expect(response.result).toContain(SECOND_SET_RENDERED_TITLE)
    expect(response.result).toContain(`href="${SECOND_SET_BASE}"`)
    expect(response.result).not.toContain(`href="${LIVE_ANIMALS_BASE}"`)
  })

  it.each([
    ['inside a set', `${LIVE_ANIMALS_BASE}/no-such-page`],
    ['outside every set', '/no-such-page']
  ])(
    'Should answer an unrouted path %s with 404 rather than 500',
    async (_where, url) => {
      // The error page renders the shared chrome. Resolving it through the
      // sole-set fallback throws with two sets mounted, which turns the 404
      // the user should see into a 500.
      const response = await server.inject(url)

      expect(response.statusCode).toBe(404)
    }
  )
})

describe('co-residency — a real set’s entry guard', () => {
  it('Should answer a journey id this set has never issued with 404', async () => {
    // The guard is an `onPreHandler` registered on the server, so — unlike a
    // route handler — `routeWithSetContext` does not wrap it. Authentication
    // crosses an async boundary after the `onPreAuth` that entered the
    // context, so the gateway has to re-enter it around the guard itself.
    // Without that the guard resolves only by the sole-set fallback, and every
    // journey page 500s as soon as a second set mounts.
    const response = await server.inject(
      `${LIVE_ANIMALS_BASE}/notifications/GBN-AG-26-NOTREAL`
    )

    // The concrete outcome, not "anything but a 500": the guard reads the
    // journey out of this set's own store, finds nothing, and the page is not
    // found.
    expect(response.statusCode).toBe(404)
  })

  it('Should send an unopened draft to the entry page inside its own set', async () => {
    const draft = await withSetContext(LIVE_ANIMALS, async () => {
      const { records } = await import('./engine/persistence/records.js')
      return records.create()
    })

    const response = await server.inject(
      `${LIVE_ANIMALS_BASE}/notifications/${draft.journeyId}`
    )

    // The redirect the guard builds carries this set's prefix, resolved inside
    // the guard's own context. Drop the guard and the hub renders 200 instead.
    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toBe(
      `${LIVE_ANIMALS_BASE}/notifications/${draft.journeyId}/origin`
    )
  })
})

describe('co-residency — interleaved requests', () => {
  it('Should keep each in-flight request in its own set while the other is still running', async () => {
    // Genuinely interleaved, not sequential: both injections are started
    // before either is awaited, so their AsyncLocalStorage contexts overlap.
    // Running them one after the other would prove nothing.
    const inFlight = [
      server.inject(`${SECOND_SET_BASE}/notifications/SUN-A/details`),
      server.inject(`${FOREIGN_REALM_BASE}/probe`),
      server.inject(`${SECOND_SET_BASE}/notifications/SUN-B/details`),
      server.inject(`${FOREIGN_REALM_BASE}/probe`)
    ]
    const [first, foreignA, second, foreignB] = await Promise.all(inFlight)

    expect(first.result.setId).toBe(SECOND_SET)
    expect(first.result.journeyId).toBe('SUN-A')
    expect(first.result.selfHref).toBe(
      `${SECOND_SET_BASE}/notifications/SUN-A/details`
    )
    expect(second.result.setId).toBe(SECOND_SET)
    expect(second.result.journeyId).toBe('SUN-B')
    expect(second.result.selfHref).toBe(
      `${SECOND_SET_BASE}/notifications/SUN-B/details`
    )
    expect(foreignA.result.setId).toBe(FOREIGN_REALM)
    expect(foreignB.result.setId).toBe(FOREIGN_REALM)
  })
})

describe('co-residency — extensions are sandboxed to their own set', () => {
  it("Should not run one set's lifecycle extension on another set's routes", async () => {
    foreignRealmExtensionRan = 0

    await server.inject(SECOND_SET_BASE)
    await server.inject(`${SECOND_SET_BASE}/notifications/SUN-A/details`)
    await server.inject('/health')
    await server.inject('/')

    // A `server.ext` registered without { sandbox: 'plugin' } is server-wide,
    // so without it this would have ticked on all four.
    expect(foreignRealmExtensionRan).toBe(0)

    await server.inject(`${FOREIGN_REALM_BASE}/probe`)
    expect(foreignRealmExtensionRan).toBe(1)
  })
})

describe('co-residency — journey cookies are scoped to their set', () => {
  it("Should scope each set's journey cookies to that set's path", async () => {
    const states = server.states.cookies

    for (const name of Object.values(LIVE_ANIMALS_COOKIES)) {
      expect(states[name]?.path, `${name} is not scoped`).toBe(
        LIVE_ANIMALS_BASE
      )
    }
    for (const name of Object.values(SECOND_SET_COOKIES)) {
      expect(states[name]?.path, `${name} is not scoped`).toBe(SECOND_SET_BASE)
    }
  })

  it('Should give the two sets different cookie names', () => {
    const liveAnimals = Object.values(LIVE_ANIMALS_COOKIES)
    const second = Object.values(SECOND_SET_COOKIES)

    expect(liveAnimals.filter((name) => second.includes(name))).toEqual([])
  })

  it('Should not send one set’s journey cookie to the other set', async () => {
    const jar = cookieJar()
    const created = await server.inject({
      method: 'POST',
      url: `${SECOND_SET_BASE}/notifications`
    })
    jar.absorb(created)

    // The positive first. A set that issued no cookie at all would satisfy the
    // negative below without proving anything, so the jar has to be shown to
    // hold this set's journey cookie before it is shown not to travel.
    expect(created.statusCode).toBe(302)
    expect(jar.namesFor(`${SECOND_SET_BASE}/notifications`)).toContain(
      SECOND_SET_COOKIES.knownJourneys
    )

    // The browser rule: a cookie scoped to /sundry-goods never travels to
    // /live-animals, so a draft started in one set cannot reach the other.
    expect(jar.namesFor(`${LIVE_ANIMALS_BASE}/notifications`)).not.toContain(
      SECOND_SET_COOKIES.knownJourneys
    )
  })

  it("Should keep one set's drafts out of the other set's records store", async () => {
    const journey = await secondSetRecords.create()
    const listed = await secondSetRecords.list({
      journeyIds: [journey.journeyId]
    })

    expect(listed.rows.map(({ journeyId }) => journeyId)).toEqual([
      journey.journeyId
    ])
    // live-animals reads its own store, which has never seen this id.
    const acrossSets = await withSetContext(LIVE_ANIMALS, async () => {
      const { records } = await import('./engine/persistence/records.js')
      return records.list({ journeyIds: [journey.journeyId] })
    })
    expect(acrossSets.rows).toEqual([])
  })

  it('Should keep the SHIPPED stub store’s journeys to the set that created them', async () => {
    // The fixture above carries a store of its own, so it cannot show what the
    // shipped stub does. This configures BOTH sets on that stub —
    // services/persistence/records — and asks whether one set's drafts reach
    // the other. A single module-level Map in stub/store/state.js would be a
    // set singleton, and both sets would list each other's notifications.
    const { records: stubRecords } =
      await import('./services/persistence/records/index.js')
    const inSet = (setId, work) => withSetContext(setId, work)

    const liveAnimalsDraft = await inSet(LIVE_ANIMALS, () =>
      stubRecords.create()
    )
    const secondSetDraft = await inSet(SECOND_SET, () => stubRecords.create())

    const bothIds = [liveAnimalsDraft.journeyId, secondSetDraft.journeyId]

    expect(
      await inSet(LIVE_ANIMALS, async () =>
        (await stubRecords.list({ journeyIds: bothIds })).rows.map(
          ({ journeyId }) => journeyId
        )
      )
    ).toEqual([liveAnimalsDraft.journeyId])
    expect(
      await inSet(SECOND_SET, async () =>
        (await stubRecords.list({ journeyIds: bothIds })).rows.map(
          ({ journeyId }) => journeyId
        )
      )
    ).toEqual([secondSetDraft.journeyId])

    expect(
      await inSet(SECOND_SET, () =>
        stubRecords.load({ journeyId: liveAnimalsDraft.journeyId })
      )
    ).toBeUndefined()

    // Clearing one set leaves the other set's drafts standing.
    await inSet(SECOND_SET, () => stubRecords.clear())

    expect(
      await inSet(LIVE_ANIMALS, () =>
        stubRecords.load({ journeyId: liveAnimalsDraft.journeyId })
      )
    ).toBeDefined()
  })
})

describe('co-residency — the server-wide surface stays server-wide', () => {
  it('Should serve /health unprefixed', async () => {
    const response = await server.inject('/health')

    expect(response.statusCode).toBe(200)
  })

  it('Should serve /signout outside every set prefix', () => {
    const paths = server.table().map((route) => route.path)

    // /signout registers perfectly happily at /live-animals/signout and fails
    // only when a user tries to sign out, so it is pinned rather than trusted.
    expect(paths).toContain('/signout')
    expect(paths).not.toContain(`${LIVE_ANIMALS_BASE}/signout`)
    expect(paths).not.toContain(`${SECOND_SET_BASE}/signout`)
  })

  it('Should serve static assets unprefixed', () => {
    const paths = server.table().map((route) => route.path)

    expect(paths).toContain('/public/{param*}')
    expect(paths).not.toContain(`${LIVE_ANIMALS_BASE}/public/{param*}`)
  })
})

describe('co-residency — the real composition root', () => {
  let realServer

  beforeAll(async () => {
    // The sign-in routes are registered by server.js alongside the router, not
    // inside it, so only the real composition root can show where they land.
    realServer = await createServer()
  })

  afterAll(async () => {
    await realServer.stop({ timeout: 0 })
  })

  it('Should keep every sign-in route outside the set prefix', () => {
    const authPaths = realServer
      .table()
      .map((route) => route.path)
      .filter((routePath) => routePath.includes('/auth/'))

    expect(authPaths.length).toBeGreaterThan(0)
    for (const routePath of authPaths) {
      expect(routePath.startsWith('/auth/'), `${routePath} is prefixed`).toBe(
        true
      )
    }
  })

  it('Should keep the real OIDC routes outside the set prefix too', () => {
    // The unit suite runs in stub mode, so the server above never registers the
    // real OIDC plugin. Ask that plugin what it declares instead, so a prefix
    // creeping into the routes only production registers is still caught.
    const declared = []
    authRoutes.plugin.register({
      route: (routes) => declared.push(...[routes].flat())
    })

    expect(declared.length).toBeGreaterThan(0)
    for (const { path: routePath } of declared) {
      expect(routePath.startsWith('/auth/'), `${routePath} is prefixed`).toBe(
        true
      )
    }
  })

  it('Should mount the default set under its prefix in the real server', () => {
    const paths = realServer.table().map((route) => route.path)

    expect(paths).toContain(LIVE_ANIMALS_BASE)
    expect(paths).toContain(`${LIVE_ANIMALS_BASE}/notifications`)
  })
})
