// Composition gateway from docs/add-a-set.md step 4.
import {
  assertFulfilmentBindingCoverage,
  configureFulfilmentRegistry
} from './bridge/fulfilment-registry.js'
import { configureRecords } from './engine/persistence/records.js'
import { configureSession } from './engine/persistence/session.js'
import { registerJourneyCookie } from './engine/journey.js'
import { buildDispatch } from './flow/dispatch.js'
import {
  configureJourneyFlow,
  journeyEntryGuardTarget
} from './flow/journey-flow.js'
import { configureObligationSet } from './model/obligations/manifest.js'
import { assertObligationPurity } from './obligation-purity.js'
import { session } from './services/persistence/session/index.js'
import {
  LAYOUT,
  SESSION_COOKIE_NAMES
} from './sets/plant-products/journeys/linear/config.js'
import { featureEvaluationBindings } from './sets/plant-products/journeys/linear/features/evaluation.js'
import {
  allRoutes,
  dispatchPages
} from './sets/plant-products/journeys/linear/features/index.js'
import { entryGuardTarget } from './sets/plant-products/journeys/linear/flow/entry-guard.js'
import {
  FLOW_ONLY_KEYS,
  sections
} from './sets/plant-products/journeys/linear/flow/flow.js'
import { nextRunTarget } from './sets/plant-products/journeys/linear/flow/run.js'
import {
  rowStatus,
  taskRows
} from './sets/plant-products/journeys/linear/flow/task-rows.js'
import * as plantProductsObligationSet from './sets/plant-products/obligations/index.js'
import { records } from './sets/plant-products/services/records/index.js'
import {
  enterSetContext,
  registerSetMount,
  routeWithSetContext,
  withSetContext
} from './shared/set-context.js'

const SET_ID = 'plant-products'
const SET_BASE = `/${SET_ID}`

export const plantProducts = {
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
        configureObligationSet(SET_ID, plantProductsObligationSet)
        configureFulfilmentRegistry(SET_ID, featureEvaluationBindings)
        configureJourneyFlow(SET_ID, {
          sections,
          taskRows,
          rowStatus,
          nextRunTarget,
          flowOnlyKeys: FLOW_ONLY_KEYS,
          entryGuardTarget,
          layout: LAYOUT
        })
        assertObligationPurity()
        assertFulfilmentBindingCoverage()
        buildDispatch(SET_ID, dispatchPages)
        configureRecords(SET_ID, records)
        configureSession(SET_ID, session, SESSION_COOKIE_NAMES)
        registerJourneyCookie(server, {
          base: SET_BASE,
          cookieNames: SESSION_COOKIE_NAMES
        })
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
        server.route(
          allRoutes.map((route) => routeWithSetContext(SET_ID, route))
        )
      })
    }
  }
}
