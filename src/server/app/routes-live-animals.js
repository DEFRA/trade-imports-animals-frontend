import { buildDispatch } from './flow/dispatch.js'
import {
  configureJourneyFlow,
  journeyEntryGuardTarget
} from './flow/journey-flow.js'
import {
  allRoutes,
  dispatchPages
} from './sets/live-animals/journeys/linear/features/index.js'
import { featureEvaluationBindings } from './sets/live-animals/journeys/linear/features/evaluation.js'
import {
  FLOW_ONLY_KEYS,
  sections
} from './sets/live-animals/journeys/linear/flow/flow.js'
import {
  rowStatus,
  taskRows
} from './sets/live-animals/journeys/linear/flow/task-rows.js'
import { sectionCaptionOf } from './sets/live-animals/journeys/linear/flow/section-captions/index.js'
import { nextRunTarget } from './sets/live-animals/journeys/linear/flow/run.js'
import { entryGuardTarget } from './sets/live-animals/journeys/linear/flow/entry-guard.js'
import {
  LAYOUT,
  SESSION_COOKIE_NAMES
} from './sets/live-animals/journeys/linear/config.js'
import * as liveAnimalsObligationSet from './sets/live-animals/obligations/index.js'
import * as commodities from './sets/live-animals/services/commodities/index.js'
import { assertObligationPurity } from './obligation-purity.js'
import { assertPartyBindingsAreScalar } from './sets/live-animals/journeys/linear/features/addresses/assert-party-bindings.js'
import {
  assertFulfilmentBindingCoverage,
  configureFulfilmentRegistry
} from './bridge/fulfilment-registry.js'
import { configureObligationSet } from './model/obligations/manifest.js'
import { configureCommodityReference } from './services/persistence/records/notification-mapper/commodity-reference.js'
import { configureRecords } from './engine/persistence/records.js'
import { records } from './services/persistence/records/index.js'
import { configureSession } from './engine/persistence/session.js'
import { session } from './services/persistence/session/index.js'
import { registerJourneyCookie } from './engine/journey.js'
import { configureAnswersForRead } from './bridge/answers-read.js'
import { withoutUnresolvedPartyRefs } from './sets/live-animals/journeys/linear/features/addresses/resolve-parties.js'
import {
  enterSetContext,
  registerSetMount,
  routeWithSetContext,
  withSetContext
} from './shared/set-context.js'
import { SET_BASE, SET_ID } from './sets/live-animals/set.js'

export const liveAnimals = {
  plugin: {
    name: SET_ID,
    register: async (server) => {
      registerSetMount(SET_ID, SET_BASE)
      await withSetContext(SET_ID, async () => {
        // Every extension below is sandboxed to this plugin's realm. Without
        // `{ sandbox: 'plugin' }` Hapi registers it server-wide, so a second
        // set's routes would run this set's guards and the last registration
        // would win. Pinned by co-residency.test.js.
        server.ext(
          'onPreAuth',
          (_request, h) => {
            enterSetContext(SET_ID)
            return h.continue
          },
          { sandbox: 'plugin' }
        )
        configureObligationSet(SET_ID, liveAnimalsObligationSet)
        configureFulfilmentRegistry(SET_ID, featureEvaluationBindings)
        configureCommodityReference(SET_ID, commodities)
        configureAnswersForRead(SET_ID, withoutUnresolvedPartyRefs)
        configureJourneyFlow(SET_ID, {
          sections,
          taskRows,
          rowStatus,
          nextRunTarget,
          flowOnlyKeys: FLOW_ONLY_KEYS,
          entryGuardTarget,
          layout: LAYOUT,
          sectionCaption: sectionCaptionOf
        })
        assertObligationPurity()
        assertFulfilmentBindingCoverage()
        assertPartyBindingsAreScalar()
        buildDispatch(SET_ID, dispatchPages)
        configureRecords(SET_ID, records)
        configureSession(SET_ID, session, SESSION_COOKIE_NAMES)
        registerJourneyCookie(server, { base: SET_BASE })
        server.ext(
          'onPreHandler',
          async (request, h) => {
            const target = await journeyEntryGuardTarget(request, h)
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
