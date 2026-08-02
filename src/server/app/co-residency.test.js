import path from 'node:path'
import Hapi from '@hapi/hapi'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { config } from '../../config/config.js'
import { nunjucksConfig } from '../../config/nunjucks/nunjucks.js'
import { DEFAULT_SET_BASE, router } from '../router.js'
import { configureJourneyFlow, journeySections } from './flow/journey-flow.js'
import { authenticatedCredentials } from './engine/test-support.js'
import { records as engineRecords } from './engine/persistence/records.js'
import {
  flowOnlyAnswersCookie,
  knownJourneysCookie,
  openingRunCookie
} from './engine/persistence/session.js'
import { records as liveAnimalsRecords } from './services/persistence/records/index.js'
import { speciesLabel } from './services/persistence/records/notification-mapper/commodity-reference.js'
import * as countries from './services/countries/index.js'
import * as ports from './services/ports/index.js'
import {
  enforcedAtContinue,
  maxEntriesFrom,
  systemAnswerKeys,
  systemPopulated
} from './bridge/obligation-source.js'
import { SESSION_COOKIE_NAMES } from './sets/live-animals/journeys/linear/config.js'
import { LAYOUT as LIVE_ANIMALS_LAYOUT } from './sets/live-animals/journeys/linear/config.js'
import { entryGuardTarget as liveAnimalsEntryGuardTarget } from './sets/live-animals/journeys/linear/flow/entry-guard.js'
import {
  FLOW_ONLY_KEYS as LIVE_ANIMALS_FLOW_ONLY_KEYS,
  sections as liveAnimalsSections
} from './sets/live-animals/journeys/linear/flow/flow.js'
import { nextRunTarget as liveAnimalsNextRunTarget } from './sets/live-animals/journeys/linear/flow/run.js'
import {
  rowStatus as liveAnimalsRowStatus,
  taskRows as liveAnimalsTaskRows
} from './sets/live-animals/journeys/linear/flow/task-rows.js'
import {
  LAYOUT as PLANT_PRODUCTS_LAYOUT,
  SESSION_COOKIE_NAMES as PLANT_PRODUCTS_COOKIE_NAMES
} from './sets/plant-products/journeys/linear/config.js'
import { entryGuardTarget as plantProductsEntryGuardTarget } from './sets/plant-products/journeys/linear/flow/entry-guard.js'
import {
  FLOW_ONLY_KEYS as PLANT_PRODUCTS_FLOW_ONLY_KEYS,
  sections as plantProductsSections
} from './sets/plant-products/journeys/linear/flow/flow.js'
import { nextRunTarget as plantProductsNextRunTarget } from './sets/plant-products/journeys/linear/flow/run.js'
import {
  rowStatus as plantProductsRowStatus,
  taskRows as plantProductsTaskRows
} from './sets/plant-products/journeys/linear/flow/task-rows.js'
import { records as plantProductsRecords } from './sets/plant-products/services/records/index.js'
import { records as plantProductsStubRecords } from './sets/plant-products/services/records/stub.js'
import {
  currentSetBase,
  currentSetId,
  enterSetContext,
  registerSetMount,
  withSetContext
} from './shared/set-context.js'
import { mockOidcConfig } from '../common/test-helpers/mock-oidc-config.js'

vi.mock('../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

const LIVE_ANIMALS = 'live-animals'
const LIVE_ANIMALS_BASE = `/${LIVE_ANIMALS}`
const PLANT_PRODUCTS = 'plant-products'
const PLANT_PRODUCTS_BASE = `/${PLANT_PRODUCTS}`
const FOREIGN_REALM = 'foreign-realm'
const FOREIGN_REALM_BASE = `/${FOREIGN_REALM}`
const FOREIGN_REALM_RESPONSE = 'foreign realm handler ran'

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
    headerFor(pathname) {
      return [...cookies.values()]
        .filter((cookie) => pathname.startsWith(cookie.path))
        .map(({ name, value }) => `${name}=${value}`)
        .join('; ')
    },
    namesFor(pathname) {
      return [...cookies.values()]
        .filter((cookie) => pathname.startsWith(cookie.path))
        .map(({ name }) => name)
        .sort()
    },
    values() {
      return [...cookies.values()]
    }
  }
}

const foreignRealm = {
  plugin: {
    name: 'foreign-realm-probe',
    register(server) {
      registerSetMount(FOREIGN_REALM, FOREIGN_REALM_BASE)
      server.ext(
        'onPreAuth',
        (_request, h) => {
          enterSetContext(FOREIGN_REALM)
          return h.continue
        },
        { sandbox: 'plugin' }
      )
      server.route({
        method: 'GET',
        path: `${FOREIGN_REALM_BASE}/probe`,
        handler: () => ({
          message: FOREIGN_REALM_RESPONSE,
          setId: currentSetId()
        })
      })
    }
  }
}

const bootServer = async ({ sets }) => {
  const server = Hapi.server({
    routes: {
      files: {
        relativeTo: path.resolve(config.get('root'), '.public')
      }
    }
  })

  await server.register([nunjucksConfig, router, ...sets])
  await server.initialize()

  return server
}

const liveAnimalsFlow = (entryGuardTarget = liveAnimalsEntryGuardTarget) => ({
  sections: liveAnimalsSections,
  taskRows: liveAnimalsTaskRows,
  rowStatus: liveAnimalsRowStatus,
  nextRunTarget: liveAnimalsNextRunTarget,
  flowOnlyKeys: LIVE_ANIMALS_FLOW_ONLY_KEYS,
  entryGuardTarget,
  layout: LIVE_ANIMALS_LAYOUT
})

const plantProductsFlow = (
  entryGuardTarget = plantProductsEntryGuardTarget
) => ({
  sections: plantProductsSections,
  taskRows: plantProductsTaskRows,
  rowStatus: plantProductsRowStatus,
  nextRunTarget: plantProductsNextRunTarget,
  flowOnlyKeys: PLANT_PRODUCTS_FLOW_ONLY_KEYS,
  entryGuardTarget,
  layout: PLANT_PRODUCTS_LAYOUT
})

describe('co-residency', () => {
  let server

  beforeAll(async () => {
    vi.stubEnv('PLANT_PRODUCTS_MODE', 'stub')
    server = await bootServer({
      sets: [foreignRealm]
    })
  })

  afterAll(async () => {
    vi.unstubAllEnvs()
    await server.stop({ timeout: 0 })
  })

  it('serves the live-animals dashboard from its mounted gateway', async () => {
    const response = await server.inject(LIVE_ANIMALS_BASE)

    expect(response.statusCode).toBe(200)
    expect(response.result).toContain('Import notification service')
    expect(response.result).toContain('Start a new notification')
  })

  it('resolves the live-animals manifest policy through all four accessors', () => {
    const policy = withSetContext(LIVE_ANIMALS, () => ({
      systemPopulated: [...systemPopulated()],
      enforcedAtContinue: [...enforcedAtContinue()],
      maxEntriesFrom: maxEntriesFrom(),
      systemAnswerKeys: [...systemAnswerKeys()]
    }))

    expect(policy).toEqual({
      systemPopulated: ['poApprovedReferenceNumber'],
      enforcedAtContinue: ['countryOfOrigin', 'commoditySelection'],
      maxEntriesFrom: {
        animalIdentifiers: 'numberOfAnimalsQuantity'
      },
      systemAnswerKeys: ['referenceNumber']
    })
  })

  it('reads divergent enforcedAtContinue policy with both manifests loaded', () => {
    expect(
      withSetContext(LIVE_ANIMALS, () => [...enforcedAtContinue()])
    ).toEqual(['countryOfOrigin', 'commoditySelection'])
    expect(
      withSetContext(PLANT_PRODUCTS, () => [...enforcedAtContinue()])
    ).toEqual(['countryOfOrigin'])
  })

  it('uses live-animals cookie names and scopes them to its mount', async () => {
    const response = await server.inject({
      method: 'POST',
      url: `${LIVE_ANIMALS_BASE}/notifications`
    })
    const responseCookies = response.headers['set-cookie'] ?? []

    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toMatch(
      /^\/live-animals\/notifications\/[^/]+\/import-type$/
    )
    expect(responseCookies).toEqual(
      expect.arrayContaining([
        expect.stringContaining(`${SESSION_COOKIE_NAMES.knownJourneys}=`)
      ])
    )
    for (const cookieName of Object.values(SESSION_COOKIE_NAMES)) {
      expect(server.states.cookies[cookieName].path).toBe(LIVE_ANIMALS_BASE)
    }
  })

  it('serves distinct dashboards for both sets from one booted server', async () => {
    const liveAnimalsResponse = await server.inject(LIVE_ANIMALS_BASE)
    const plantProductsResponse = await server.inject(PLANT_PRODUCTS_BASE)

    expect(liveAnimalsResponse.statusCode).toBe(200)
    expect(liveAnimalsResponse.result).toContain('Import notification service')
    expect(liveAnimalsResponse.result).toContain('Start a new notification')
    expect(liveAnimalsResponse.result).not.toContain(
      'Plants, plant products and other objects'
    )
    expect(plantProductsResponse.statusCode).toBe(200)
    expect(plantProductsResponse.result).toContain('Your import notifications')
    expect(plantProductsResponse.result).toContain('Create a new notification')
    expect(plantProductsResponse.result).not.toContain(
      'Start a new notification'
    )
  })

  it('keeps every server-wide route unprefixed with both sets registered', async () => {
    const root = await server.inject('/')
    const signout = await server.inject('/signout')
    const health = await server.inject('/health')
    const asset = await server.inject(
      `${config.get('assetPath')}/assets/images/govuk-crest.svg`
    )

    expect(root.statusCode).toBe(302)
    expect(root.headers.location).toBe('/live-animals')
    expect(signout.statusCode).not.toBe(404)
    expect(health.statusCode).toBe(200)
    expect(asset.statusCode).toBe(200)
  })

  it('mounts both production sets symmetrically and never at the root', () => {
    const productionMounts = [LIVE_ANIMALS, PLANT_PRODUCTS].map((setId) => ({
      setId,
      base: withSetContext(setId, currentSetBase)
    }))

    expect(productionMounts).toEqual([
      { setId: LIVE_ANIMALS, base: `/${LIVE_ANIMALS}` },
      { setId: PLANT_PRODUCTS, base: `/${PLANT_PRODUCTS}` }
    ])
    expect(productionMounts.every(({ base }) => base !== '')).toBe(true)
  })

  it('resolves each set own manifest, flow, records and cookie names', async () => {
    const liveAnimals = await withSetContext(LIVE_ANIMALS, async () => ({
      enforcedAtContinue: [...enforcedAtContinue()],
      sectionIds: journeySections().map(({ id }) => id),
      record: await engineRecords.create(),
      knownJourneysCookie: knownJourneysCookie()
    }))
    const plantProducts = await withSetContext(PLANT_PRODUCTS, async () => ({
      enforcedAtContinue: [...enforcedAtContinue()],
      sectionIds: journeySections().map(({ id }) => id),
      record: await engineRecords.create(),
      knownJourneysCookie: knownJourneysCookie()
    }))

    expect(liveAnimals.enforcedAtContinue).toEqual([
      'countryOfOrigin',
      'commoditySelection'
    ])
    expect(plantProducts.enforcedAtContinue).toEqual(['countryOfOrigin'])
    expect(liveAnimals.sectionIds).toContain('commodities')
    expect(plantProducts.sectionIds).toEqual([
      'start',
      'origin',
      'purpose',
      'transport',
      'review'
    ])
    expect(liveAnimals.record.journeyId).toMatch(/^GBN-AG-/)
    expect(plantProducts.record.journeyId).toMatch(/^GBN-PP-/)
    expect(liveAnimals.knownJourneysCookie).toBe(
      SESSION_COOKIE_NAMES.knownJourneys
    )
    expect(plantProducts.knownJourneysCookie).toBe(
      PLANT_PRODUCTS_COOKIE_NAMES.knownJourneys
    )
  })

  it('keeps each set records behind its own configured engine seam', async () => {
    const liveAnimals = await withSetContext(LIVE_ANIMALS, () =>
      engineRecords.create()
    )
    const plantProducts = await withSetContext(PLANT_PRODUCTS, () =>
      engineRecords.create()
    )

    const liveAnimalsList = await withSetContext(LIVE_ANIMALS, () =>
      engineRecords.list({
        journeyIds: [liveAnimals.journeyId, plantProducts.journeyId]
      })
    )
    const plantProductsList = await withSetContext(PLANT_PRODUCTS, () =>
      engineRecords.list({
        journeyIds: [liveAnimals.journeyId, plantProducts.journeyId]
      })
    )

    expect(liveAnimals.journeyId).toMatch(/^GBN-AG-/)
    expect(plantProducts.journeyId).toMatch(
      /^GBN-PP-\d{2}-[0-9A-HJ-KM-NP-TV-Z]{6}$/
    )
    expect(liveAnimalsList.rows.map(({ journeyId }) => journeyId)).toEqual([
      liveAnimals.journeyId
    ])
    expect(plantProductsList.rows.map(({ journeyId }) => journeyId)).toEqual([
      plantProducts.journeyId
    ])
  })

  it('leaves the plant slot of the live-animals commodity mapper absent', () => {
    expect(() =>
      withSetContext(PLANT_PRODUCTS, () => speciesLabel('fixture'))
    ).toThrow('commodity reference not configured for set "plant-products"')
  })

  it('keeps both sets cookie names and mount paths independent', async () => {
    const liveAnimalsResponse = await server.inject({
      method: 'POST',
      url: `${LIVE_ANIMALS_BASE}/notifications`
    })
    const plantProductsResponse = await server.inject({
      method: 'POST',
      url: `${PLANT_PRODUCTS_BASE}/notifications`
    })
    const liveAnimalsCookies = liveAnimalsResponse.headers['set-cookie'] ?? []
    const plantProductsCookies =
      plantProductsResponse.headers['set-cookie'] ?? []

    expect(liveAnimalsCookies.join(';')).toContain(
      `${SESSION_COOKIE_NAMES.knownJourneys}=`
    )
    expect(liveAnimalsCookies.join(';')).not.toContain('plantProducts')
    expect(plantProductsCookies.join(';')).toContain(
      `${PLANT_PRODUCTS_COOKIE_NAMES.knownJourneys}=`
    )
    expect(plantProductsCookies.join(';')).not.toContain('liveAnimals')
    for (const cookieName of Object.values(SESSION_COOKIE_NAMES)) {
      expect(server.states.cookies[cookieName].path).toBe(LIVE_ANIMALS_BASE)
    }
    for (const cookieName of Object.values(PLANT_PRODUCTS_COOKIE_NAMES)) {
      expect(server.states.cookies[cookieName].path).toBe(PLANT_PRODUCTS_BASE)
    }
  })

  it('keeps all three session cookies and draft visibility independent', async () => {
    const jar = cookieJar()
    const liveAnimalsResponse = await server.inject({
      method: 'POST',
      url: `${LIVE_ANIMALS_BASE}/notifications`
    })
    const plantProductsResponse = await server.inject({
      method: 'POST',
      url: `${PLANT_PRODUCTS_BASE}/notifications`
    })
    jar.absorb(liveAnimalsResponse)
    jar.absorb(plantProductsResponse)
    const liveAnimalsEntry = liveAnimalsResponse.headers.location
    const plantProductsEntry = plantProductsResponse.headers.location
    const liveAnimalsJourneyId = liveAnimalsEntry.split('/')[3]
    const plantProductsJourneyId = plantProductsEntry.split('/')[3]

    const liveAnimalsPost = await server.inject({
      method: 'POST',
      url: liveAnimalsEntry,
      headers: { cookie: jar.headerFor(liveAnimalsEntry) },
      payload: { importType: 'live-animals' }
    })
    jar.absorb(liveAnimalsPost)
    const plantProductsPost = await server.inject({
      method: 'POST',
      url: plantProductsEntry,
      headers: { cookie: jar.headerFor(plantProductsEntry) },
      payload: { importType: 'plants' }
    })
    jar.absorb(plantProductsPost)

    expect(liveAnimalsPost.statusCode).toBe(302)
    expect(plantProductsPost.statusCode).toBe(302)

    const liveAnimalsCookies = jar
      .values()
      .filter(({ name }) => name.startsWith('liveAnimals'))
    const plantProductsCookies = jar
      .values()
      .filter(({ name }) => name.startsWith('plantProducts'))

    expect(liveAnimalsCookies.map(({ name }) => name).sort()).toEqual(
      Object.values(SESSION_COOKIE_NAMES).sort()
    )
    expect(plantProductsCookies.map(({ name }) => name).sort()).toEqual(
      Object.values(PLANT_PRODUCTS_COOKIE_NAMES).sort()
    )
    expect(
      liveAnimalsCookies.every(({ path }) => path === LIVE_ANIMALS_BASE)
    ).toBe(true)
    expect(
      plantProductsCookies.every(({ path }) => path === PLANT_PRODUCTS_BASE)
    ).toBe(true)
    expect(jar.namesFor(LIVE_ANIMALS_BASE)).toEqual(
      Object.values(SESSION_COOKIE_NAMES).sort()
    )
    expect(jar.namesFor(PLANT_PRODUCTS_BASE)).toEqual(
      Object.values(PLANT_PRODUCTS_COOKIE_NAMES).sort()
    )

    expect(
      withSetContext(LIVE_ANIMALS, () => ({
        knownJourneys: knownJourneysCookie(),
        openingRun: openingRunCookie(),
        flowOnlyAnswers: flowOnlyAnswersCookie()
      }))
    ).toEqual(SESSION_COOKIE_NAMES)
    expect(
      withSetContext(PLANT_PRODUCTS, () => ({
        knownJourneys: knownJourneysCookie(),
        openingRun: openingRunCookie(),
        flowOnlyAnswers: flowOnlyAnswersCookie()
      }))
    ).toEqual(PLANT_PRODUCTS_COOKIE_NAMES)

    const liveAnimalsDashboard = await server.inject({
      url: LIVE_ANIMALS_BASE,
      headers: { cookie: jar.headerFor(LIVE_ANIMALS_BASE) }
    })
    const plantProductsDashboard = await server.inject({
      url: PLANT_PRODUCTS_BASE,
      headers: { cookie: jar.headerFor(PLANT_PRODUCTS_BASE) }
    })

    expect(liveAnimalsDashboard.result).toContain(liveAnimalsJourneyId)
    expect(liveAnimalsDashboard.result).not.toContain(plantProductsJourneyId)
    expect(plantProductsDashboard.result).toContain(plantProductsJourneyId)
    expect(plantProductsDashboard.result).not.toContain(liveAnimalsJourneyId)

    const plantCannotResumeLive = await server.inject({
      url: `${PLANT_PRODUCTS_BASE}/notifications/${liveAnimalsJourneyId}`,
      headers: { cookie: jar.headerFor(PLANT_PRODUCTS_BASE) }
    })
    const liveCannotResumePlant = await server.inject({
      url: `${LIVE_ANIMALS_BASE}/notifications/${plantProductsJourneyId}`,
      headers: { cookie: jar.headerFor(LIVE_ANIMALS_BASE) }
    })

    expect(plantCannotResumeLive.statusCode).toBe(404)
    expect(liveCannotResumePlant.statusCode).toBe(404)
  })

  it('refuses cold deep links in the owning guard realm and never redirects across sets', async () => {
    const liveAnimalsCreate = await server.inject({
      method: 'POST',
      url: `${LIVE_ANIMALS_BASE}/notifications`
    })
    const plantProductsCreate = await server.inject({
      method: 'POST',
      url: `${PLANT_PRODUCTS_BASE}/notifications`
    })
    const liveAnimalsJourneyId =
      liveAnimalsCreate.headers.location.split('/')[3]
    const plantProductsJourneyId =
      plantProductsCreate.headers.location.split('/')[3]

    const liveAnimalsDeepLink = await server.inject({
      url: `${LIVE_ANIMALS_BASE}/notifications/${liveAnimalsJourneyId}`
    })
    const plantProductsDeepLink = await server.inject({
      url: `${PLANT_PRODUCTS_BASE}/notifications/${plantProductsJourneyId}`
    })

    expect(liveAnimalsDeepLink.statusCode).toBe(302)
    expect(liveAnimalsDeepLink.headers.location).toBe(
      `${LIVE_ANIMALS_BASE}/notifications/${liveAnimalsJourneyId}/import-type`
    )
    expect(liveAnimalsDeepLink.headers.location).not.toContain(
      PLANT_PRODUCTS_BASE
    )
    expect(plantProductsDeepLink.statusCode).toBe(302)
    expect(plantProductsDeepLink.headers.location).toBe(
      `${PLANT_PRODUCTS_BASE}/notifications/${plantProductsJourneyId}/import-type`
    )
    expect(plantProductsDeepLink.headers.location).not.toContain(
      LIVE_ANIMALS_BASE
    )
  })

  it('runs each realm entry guard exactly once and never the other set guard', async () => {
    const liveAnimalsGuard = vi.fn(liveAnimalsEntryGuardTarget)
    const plantProductsGuard = vi.fn(plantProductsEntryGuardTarget)
    configureJourneyFlow(LIVE_ANIMALS, liveAnimalsFlow(liveAnimalsGuard))
    configureJourneyFlow(PLANT_PRODUCTS, plantProductsFlow(plantProductsGuard))

    try {
      const plantProductsResponse = await server.inject(PLANT_PRODUCTS_BASE)
      expect(plantProductsResponse.statusCode).toBe(200)
      expect(plantProductsGuard).toHaveBeenCalledTimes(1)
      expect(liveAnimalsGuard).not.toHaveBeenCalled()

      plantProductsGuard.mockClear()
      const liveAnimalsResponse = await server.inject(LIVE_ANIMALS_BASE)
      expect(liveAnimalsResponse.statusCode).toBe(200)
      expect(liveAnimalsGuard).toHaveBeenCalledTimes(1)
      expect(plantProductsGuard).not.toHaveBeenCalled()
    } finally {
      configureJourneyFlow(LIVE_ANIMALS, liveAnimalsFlow())
      configureJourneyFlow(PLANT_PRODUCTS, plantProductsFlow())
    }
  })

  // This case proves that each set re-establishes its own context after the
  // application's real async request pipeline. Resetting the module graph gives
  // the server a fresh AsyncLocalStorage, so ambient worker context cannot mask
  // a missing route-owned boundary.
  it('establishes route context after application async boundaries', async () => {
    vi.resetModules()
    const { createServer: createIsolatedServer } = await import('../server.js')
    const boundaryServer = await createIsolatedServer()
    await boundaryServer.initialize()
    const sessionId = 'CO_RESIDENCY_ASYNC_BOUNDARY'
    const credentials = { ...authenticatedCredentials, sessionId }
    await boundaryServer.app.cache.set(sessionId, credentials)

    try {
      const liveAnimalsResponse = await boundaryServer.inject({
        url: LIVE_ANIMALS_BASE,
        auth: { strategy: 'session', credentials }
      })
      const plantProductsResponse = await boundaryServer.inject({
        url: PLANT_PRODUCTS_BASE,
        auth: { strategy: 'session', credentials }
      })

      expect(liveAnimalsResponse.statusCode).toBe(200)
      expect(liveAnimalsResponse.result).toContain(
        'Import notification service'
      )
      expect(plantProductsResponse.statusCode).toBe(200)
      expect(plantProductsResponse.result).toContain(
        'Your import notifications'
      )
    } finally {
      await boundaryServer.stop({ timeout: 0 })
    }
  })

  // This separate pin proves that established request contexts stay isolated
  // while two set-owned handlers are genuinely interleaved.
  it('retains both set contexts across genuinely interleaved requests', async () => {
    const originalLiveAnimalsList = liveAnimalsRecords.list
    const originalPlantProductsList = plantProductsRecords.list
    const contexts = []
    const events = []
    let releaseLiveAnimals
    let markLiveAnimalsSuspended
    const liveAnimalsCanResume = new Promise((resolve) => {
      releaseLiveAnimals = resolve
    })
    const liveAnimalsSuspended = new Promise((resolve) => {
      markLiveAnimalsSuspended = resolve
    })

    liveAnimalsRecords.list = async (...args) => {
      contexts.push([
        'live-animals',
        'before',
        currentSetId(),
        knownJourneysCookie(),
        [...enforcedAtContinue()]
      ])
      events.push('live-animals suspended')
      markLiveAnimalsSuspended()
      await liveAnimalsCanResume
      events.push('live-animals resumed')
      const result = await originalLiveAnimalsList(...args)
      contexts.push([
        'live-animals',
        'after',
        currentSetId(),
        knownJourneysCookie(),
        [...enforcedAtContinue()]
      ])
      return result
    }
    plantProductsRecords.list = async (...args) => {
      contexts.push([
        'plant-products',
        'during',
        currentSetId(),
        knownJourneysCookie(),
        [...enforcedAtContinue()]
      ])
      return originalPlantProductsList(...args)
    }

    try {
      const liveAnimalsRequest = server.inject(LIVE_ANIMALS_BASE)
      await liveAnimalsSuspended

      events.push('plant-products started')
      const plantProductsResponse = await server.inject(PLANT_PRODUCTS_BASE)
      events.push('plant-products finished')
      expect(plantProductsResponse.statusCode).toBe(200)

      releaseLiveAnimals()
      const liveAnimalsResponse = await liveAnimalsRequest
      expect(liveAnimalsResponse.statusCode).toBe(200)
      expect(events).toEqual([
        'live-animals suspended',
        'plant-products started',
        'plant-products finished',
        'live-animals resumed'
      ])
      expect(contexts).toEqual([
        [
          'live-animals',
          'before',
          LIVE_ANIMALS,
          SESSION_COOKIE_NAMES.knownJourneys,
          ['countryOfOrigin', 'commoditySelection']
        ],
        [
          'plant-products',
          'during',
          PLANT_PRODUCTS,
          PLANT_PRODUCTS_COOKIE_NAMES.knownJourneys,
          ['countryOfOrigin']
        ],
        [
          'live-animals',
          'after',
          LIVE_ANIMALS,
          SESSION_COOKIE_NAMES.knownJourneys,
          ['countryOfOrigin', 'commoditySelection']
        ]
      ])
    } finally {
      releaseLiveAnimals()
      liveAnimalsRecords.list = originalLiveAnimalsList
      plantProductsRecords.list = originalPlantProductsList
    }
  })

  it('honours plant stub and live fake-real modes independently and primes once', async () => {
    const originalLiveAnimalsList = liveAnimalsRecords.list
    const fakeRealList = vi.fn(async () => ({
      rows: [],
      page: 1,
      size: 20,
      totalElements: 0,
      totalPages: 0
    }))
    const countryPrime = vi.spyOn(countries, 'prime').mockResolvedValue()
    const portPrime = vi.spyOn(ports, 'prime').mockResolvedValue()
    let modeServer

    vi.stubEnv('LIVE_ANIMALS_MODE', 'real')
    vi.stubEnv('PLANT_PRODUCTS_MODE', 'stub')
    liveAnimalsRecords.list = fakeRealList
    await plantProductsStubRecords.clear()

    try {
      modeServer = await bootServer({ sets: [] })
      const liveAnimalsResponse = await modeServer.inject(LIVE_ANIMALS_BASE)
      const plantProductsResponse = await modeServer.inject(PLANT_PRODUCTS_BASE)

      expect(liveAnimalsResponse.statusCode).toBe(200)
      expect(plantProductsResponse.statusCode).toBe(200)
      expect(plantProductsResponse.result).toContain(
        'Your import notifications'
      )
      expect(fakeRealList).toHaveBeenCalledTimes(1)
      expect(countryPrime).toHaveBeenCalledTimes(1)
      expect(portPrime).toHaveBeenCalledTimes(1)
    } finally {
      if (modeServer) await modeServer.stop({ timeout: 0 })
      liveAnimalsRecords.list = originalLiveAnimalsList
      countryPrime.mockRestore()
      portPrime.mockRestore()
      vi.stubEnv('LIVE_ANIMALS_MODE', 'stub')
      vi.stubEnv('PLANT_PRODUCTS_MODE', 'stub')
    }
  })

  it('redirects the unowned root temporarily to the named default set', async () => {
    const response = await server.inject('/')

    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toBe(DEFAULT_SET_BASE)
  })

  it('keeps signout at its unprefixed server-wide path', async () => {
    const response = await server.inject('/signout')

    expect(response.statusCode).not.toBe(404)
  })

  it('keeps static assets at their unprefixed server-wide path', async () => {
    const response = await server.inject(
      `${config.get('assetPath')}/assets/images/govuk-crest.svg`
    )

    expect(response.statusCode).toBe(200)
  })

  it('keeps health at its unprefixed server-wide path', async () => {
    const response = await server.inject('/health')

    expect(response.statusCode).toBe(200)
  })

  it('does not run the live-animals entry guard for a foreign plugin realm', async () => {
    const response = await server.inject(`${FOREIGN_REALM_BASE}/probe`)

    expect(response.statusCode).toBe(200)
    expect(response.result).toEqual({
      message: FOREIGN_REALM_RESPONSE,
      setId: FOREIGN_REALM
    })
  })

  it('retains live-animals context across genuinely interleaved requests', async () => {
    const originalList = liveAnimalsRecords.list
    const events = []
    const contexts = []
    let releaseFirst
    let markFirstSuspended
    const firstCanResume = new Promise((resolve) => {
      releaseFirst = resolve
    })
    const firstSuspended = new Promise((resolve) => {
      markFirstSuspended = resolve
    })

    liveAnimalsRecords.list = async (...args) => {
      contexts.push(['live-animals', 'before', currentSetId()])
      events.push('first suspended')
      markFirstSuspended()
      await firstCanResume
      events.push('first resumed')
      const result = await originalList(...args)
      contexts.push(['live-animals', 'after', currentSetId()])
      return result
    }

    try {
      const firstRequest = server.inject(LIVE_ANIMALS_BASE)
      await firstSuspended

      events.push('second started')
      const secondResponse = await server.inject(`${FOREIGN_REALM_BASE}/probe`)
      events.push('second finished')
      expect(secondResponse.statusCode).toBe(200)
      expect(secondResponse.result).toEqual({
        message: FOREIGN_REALM_RESPONSE,
        setId: FOREIGN_REALM
      })

      releaseFirst()
      const firstResponse = await firstRequest
      expect(firstResponse.statusCode).toBe(200)

      expect(events).toEqual([
        'first suspended',
        'second started',
        'second finished',
        'first resumed'
      ])
      expect(contexts).toEqual([
        ['live-animals', 'before', LIVE_ANIMALS],
        ['live-animals', 'after', LIVE_ANIMALS]
      ])
    } finally {
      releaseFirst()
      liveAnimalsRecords.list = originalList
    }
  })
})
