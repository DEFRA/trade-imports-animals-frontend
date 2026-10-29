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
import { configureReadyForCheckYourAnswers } from '../../src/server/app/bridge/readiness-config.js'
import { readyForCheckYourAnswers } from '../../src/server/app/flow/section-status.js'
import { registerJourneyCookie } from '../../src/server/app/engine/journey.js'
import { assertSetConfigured } from '../../src/server/app/set-completeness.js'
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

export const FEATURE_NAME = 'sundry-details'

export const SESSION_COOKIE_NAMES = Object.freeze({
  knownJourneys: 'sundryGoodsKnownJourneys',
  openingRun: 'sundryGoodsOpeningRun',
  flowOnlyAnswers: 'sundryGoodsFlowOnlyAnswers',
  addressHandshakeTokens: 'sundryGoodsAddressHandshakeTokens',
  addedAddressBanner: 'sundryGoodsAddedAddressBanner',
  reviewedConcurrencyTokens: 'sundryGoodsReviewedConcurrencyTokens'
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

export const RENDERED_ROUTE_PATH = '/rendered'
export const RENDERED_TITLE = 'Sundry goods rendered'

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
      selfHref: pagePath(request.params.journeyId, detailsPage.slug)
    })
  },
  {
    method: 'POST',
    path: createRoutePath(),
    options: { auth: false },
    handler: async (request, h) => {
      const journey = await records.create()
      await session.addKnownJourney(request, h, journey.journeyId)
      return h.redirect(pagePath(journey.journeyId, detailsPage.slug))
    }
  },
  {
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
        configureReadyForCheckYourAnswers(SET_ID, readyForCheckYourAnswers)
        configureJourneyFlow(SET_ID, {
          sections,
          taskRows: [],
          rowStatus: () => 'notStarted',
          nextRunTarget: () => null,
          previousRunTarget: () => null,
          flowOnlyKeys: [],
          entryGuardTarget: async () => null,
          layout: 'shared/layout.njk'
        })
        buildDispatch(SET_ID, dispatchPages)
        configureRecords(SET_ID, records)
        configureSession(SET_ID, sessionStub, SESSION_COOKIE_NAMES)
        registerJourneyCookie(server)
        server.ext(
          'onPreHandler',
          async (request, h) => {
            const target = await withSetContext(SET_ID, () =>
              journeyEntryGuardTarget(request, h)
            )
            return target ? h.redirect(target).takeover() : h.continue
          },
          { sandbox: 'plugin' }
        )
        server.route(routes.map((route) => routeWithSetContext(SET_ID, route)))
        assertSetConfigured(server, SET_ID)
      })
    }
  }
}
