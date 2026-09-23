/**
 * A second obligation set, defined only for tests.
 *
 * Co-residency is a property of the platform, not of any particular set, so
 * proving it needs two sets mounted in one process — but shipping a second
 * real set would mean shipping a journey nobody asked for. This fixture is the
 * smallest thing that satisfies every configure* seam and mounts under its own
 * prefix, so the co-residency and tripwire suites can register it alongside
 * live-animals.
 *
 * Its routes deliberately echo the configuration they resolve rather than
 * render anything. A test asserting "this route saw its own set's obligations"
 * needs to read them back, and a template would only get in the way.
 */
import {
  feature,
  scalar
} from '../../src/server/app/bridge/fulfilment-bindings.js'
import { buildDispatch } from '../../src/server/app/flow/dispatch.js'
import {
  configureJourneyFlow,
  journeyEntryGuardTarget
} from '../../src/server/app/flow/journey-flow.js'
import { configureObligationSet } from '../../src/server/app/model/obligations/manifest.js'
import { configureFulfilmentRegistry } from '../../src/server/app/bridge/fulfilment-registry.js'
import { configureRecords } from '../../src/server/app/engine/persistence/records.js'
import {
  configureSession,
  session
} from '../../src/server/app/engine/persistence/session.js'
import { configureAnswersForRead } from '../../src/server/app/bridge/answers-read.js'
import { registerJourneyCookie } from '../../src/server/app/engine/journey.js'
import {
  enterSetContext,
  registerSetMount,
  routeWithSetContext,
  withSetContext
} from '../../src/server/app/shared/set-context.js'
import {
  createRoutePath,
  dashboardPath,
  dashboardRoutePath,
  hubRoutePath,
  pagePath,
  pageRoutePath
} from '../../src/server/app/shared/paths.js'
import { obligations as obligationsOf } from '../../src/server/app/model/obligations/manifest.js'
import { base } from '../../src/server/app/shared/kit.js'
import { session as sessionStub } from '../../src/server/app/services/persistence/session/stub.js'

export const SET_ID = 'sundry-goods'
export const SET_BASE = `/${SET_ID}`

/** Named so it cannot collide with any live-animals feature name — the point
 * a per-set registry assertion turns on. */
export const FEATURE_NAME = 'sundry-details'

export const SESSION_COOKIE_NAMES = Object.freeze({
  knownJourneys: 'sundryGoodsKnownJourneys',
  openingRun: 'sundryGoodsOpeningRun',
  flowOnlyAnswers: 'sundryGoodsFlowOnlyAnswers',
  addressHandshakeTokens: 'sundryGoodsAddressHandshakeTokens'
})

export const shipmentReference = {
  id: 'f1e2d3c4-b5a6-4079-8899-aabbccddeeff',
  name: 'shipmentReference',
  status: 'mandatory'
}

export const obligations = [shipmentReference]
export const groups = []

const detailsPage = { id: 'details', slug: 'details' }

export const dispatchPages = [
  { ...detailsPage, collects: [shipmentReference.name] }
]

const sections = [{ id: 'details', pages: [detailsPage] }]

/** The set's own in-memory records store, so nothing is shared with any other
 * set by accident — the point most of these tests are making. */
const createRecordsStub = () => {
  const journeys = new Map()
  let next = 0
  return {
    create: async () => {
      const journeyId = `SUN-${(next += 1)}`
      const journey = { journeyId, status: 'draft', fulfilment: {} }
      journeys.set(journeyId, journey)
      return structuredClone(journey)
    },
    load: async ({ journeyId }) => {
      const journey = journeys.get(journeyId)
      return journey ? structuredClone(journey) : undefined
    },
    list: async ({ journeyIds = [] } = {}) => ({
      rows: journeyIds
        .filter((journeyId) => journeys.has(journeyId))
        .map((journeyId) => structuredClone(journeys.get(journeyId))),
      page: 1,
      size: journeyIds.length,
      totalElements: journeyIds.length,
      totalPages: 1
    }),
    has: async (journeyId) => journeys.has(journeyId),
    replaceFulfilment: async (journeyId, fulfilment) => {
      const journey = { ...journeys.get(journeyId), fulfilment }
      journeys.set(journeyId, journey)
      return structuredClone(journey)
    },
    finalise: async (journeyId) => structuredClone(journeys.get(journeyId)),
    amend: async (journeyId) => structuredClone(journeys.get(journeyId)),
    cancelAmend: async (journeyId) => structuredClone(journeys.get(journeyId)),
    copy: async () => undefined,
    softDelete: async (journeyId) => journeys.delete(journeyId),
    clear: async () => journeys.clear()
  }
}

export const records = createRecordsStub()

/** A route shape whose handler renders a real Nunjucks view. */
export const RENDERED_ROUTE_PATH = '/rendered'
export const RENDERED_TITLE = 'Sundry goods rendered'

/** Reports which set answered, and with whose configuration — the two facts
 * every co-residency assertion turns on. */
const whoAnswered = () => ({
  setId: SET_ID,
  dashboardPath: dashboardPath(),
  obligationNames: obligationsOf().map(({ name }) => name),
  sectionIds: sections.map((section) => section.id)
})

export const routes = [
  {
    method: 'GET',
    path: dashboardRoutePath(),
    options: { auth: false },
    handler: () => whoAnswered()
  },
  {
    method: 'GET',
    path: hubRoutePath(),
    options: { auth: false },
    handler: (request) => ({
      ...whoAnswered(),
      journeyId: request.params.journeyId
    })
  },
  {
    method: 'GET',
    path: pageRoutePath(detailsPage.slug),
    options: { auth: false },
    handler: (request) => ({
      ...whoAnswered(),
      journeyId: request.params.journeyId,
      // A link built inside this request — the prefix it carries is the set
      // context's answer, which is what an interleaving test reads back.
      selfHref: pagePath(request.params.journeyId, detailsPage.slug)
    })
  },
  {
    method: 'POST',
    path: createRoutePath(),
    options: { auth: false },
    handler: async (request, h) => {
      const journey = await records.create()
      // The live-animals gateway starts a journey through the engine, which
      // records it in the session. Without this the set issues no journey
      // cookie at all, and a test asserting the cookie does not cross into the
      // other set would pass on an empty jar.
      await session.addKnownJourney(request, h, journey.journeyId)
      return h.redirect(pagePath(journey.journeyId, detailsPage.slug))
    }
  },
  {
    // The only route here that renders a template rather than echoing JSON:
    // the view is marshalled after the handler returns, so it is the one shape
    // that proves the RENDER path resolves this set with two sets mounted.
    method: 'GET',
    path: RENDERED_ROUTE_PATH,
    options: { auth: false },
    handler: (_request, h) =>
      h.view('shared/error', {
        ...base(RENDERED_TITLE),
        heading: RENDERED_TITLE,
        message: dashboardPath()
      })
  }
]

/**
 * Mirrors routes-live-animals.js: mount registration, a sandboxed onPreAuth to
 * enter the set context, every seam configured with this set's id, per-set
 * cookies scoped to the set base, a sandboxed entry guard, and routes wrapped
 * so handlers run inside the context.
 */
export const secondSet = {
  plugin: {
    name: SET_ID,
    register: async (server) => {
      registerSetMount(SET_ID, SET_BASE)
      await withSetContext(SET_ID, async () => {
        server.ext(
          'onPreAuth',
          (_request, h) => {
            enterSetContext(SET_ID)
            return h.continue
          },
          { sandbox: 'plugin' }
        )
        configureObligationSet(SET_ID, { obligations, groups })
        configureFulfilmentRegistry(SET_ID, [
          feature(FEATURE_NAME, [
            scalar({
              field: shipmentReference.name,
              obligation: shipmentReference
            })
          ])
        ])
        configureAnswersForRead(SET_ID, async (_request, answers) => answers)
        configureJourneyFlow(SET_ID, {
          sections,
          taskRows: [],
          rowStatus: () => 'notStarted',
          nextRunTarget: () => null,
          flowOnlyKeys: [],
          entryGuardTarget: async () => null,
          layout: 'shared/layout.njk'
        })
        buildDispatch(SET_ID, dispatchPages)
        configureRecords(SET_ID, records)
        configureSession(SET_ID, sessionStub, SESSION_COOKIE_NAMES)
        registerJourneyCookie(server, { base: SET_BASE })
        server.ext(
          'onPreHandler',
          async (request, h) => {
            // Wrapped the way routes-live-animals.js wraps it: authentication
            // crosses an async boundary after the onPreAuth above, so the guard
            // has to re-enter the context itself.
            const target = await withSetContext(SET_ID, () =>
              journeyEntryGuardTarget(request, h)
            )
            return target ? h.redirect(target).takeover() : h.continue
          },
          { sandbox: 'plugin' }
        )
        server.route(routes.map((route) => routeWithSetContext(SET_ID, route)))
      })
    }
  }
}
