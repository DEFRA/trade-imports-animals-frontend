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
import { nextRunTarget } from './sets/live-animals/journeys/linear/flow/run.js'
import { entryGuardTarget } from './sets/live-animals/journeys/linear/flow/entry-guard.js'
import {
  LAYOUT,
  SESSION_COOKIE_NAMES
} from './sets/live-animals/journeys/linear/config.js'
import * as liveAnimalsObligationSet from './sets/live-animals/obligations/index.js'
import * as commodities from './sets/live-animals/services/commodities/index.js'
import { assertObligationPurity } from './obligation-purity.js'
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
import { isStubMode } from '../common/services/mode.js'
import * as countries from './services/countries/index.js'
import * as ports from './services/ports/index.js'
import { configureAnswersForRead } from './bridge/answers-read.js'
import { withoutUnresolvedPartyRefs } from './sets/live-animals/journeys/linear/features/addresses/resolve-parties.js'

export const liveAnimals = {
  plugin: {
    name: 'live-animals',
    register: async (server) => {
      configureObligationSet(liveAnimalsObligationSet)
      configureFulfilmentRegistry(featureEvaluationBindings)
      configureCommodityReference(commodities)
      configureAnswersForRead(withoutUnresolvedPartyRefs)
      configureJourneyFlow({
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
      buildDispatch(dispatchPages)
      configureRecords(records)
      configureSession(session, SESSION_COOKIE_NAMES)
      registerJourneyCookie(server)
      server.ext('onPreHandler', async (request, h) => {
        const target = await journeyEntryGuardTarget(request, h)
        return target ? h.redirect(target).takeover() : h.continue
      })
      if (!isStubMode()) {
        await countries.prime()
        await ports.prime()
      }
      server.route(allRoutes)
    }
  }
}
