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
import {
  nextRunTarget,
  runBackTarget
} from './sets/live-animals/journeys/linear/flow/run.js'
import { entryGuardTarget } from './sets/live-animals/journeys/linear/flow/entry-guard.js'
import {
  LAYOUT,
  SESSION_COOKIE_NAMES
} from './sets/live-animals/journeys/linear/config.js'
import * as liveAnimalsObligationSet from './sets/live-animals/obligations/index.js'
import * as commodities from './sets/live-animals/services/commodities/index.js'
import { assertObligationPurity } from './obligation-purity.js'
import { assertSetConfigured } from './set-completeness.js'
import { assertPartyBindingsAreScalar } from './sets/live-animals/journeys/linear/features/addresses/assert-party-bindings.js'
import {
  assertFulfilmentBindingCoverage,
  configureFulfilmentRegistry
} from './bridge/fulfilment-registry.js'
import { configureObligationSet } from './model/obligations/manifest.js'
import { configureCommodityReference } from './services/persistence/records/notification-mapper/commodity-reference.js'
import {
  configureRecords,
  configureTemplateRecords
} from './engine/persistence/records.js'
import { records } from './services/persistence/records/index.js'
import { createTemplateRecords } from './services/persistence/template-records/index.js'
import { templateModeRoutes } from './shared/template-mode.js'
import { withTemplatePage } from './sets/live-animals/journeys/linear/features/template-page/controller.js'
import { withTemplateChange } from './sets/live-animals/journeys/linear/features/template-page/change.js'
import {
  TEMPLATE_MODE_EXCLUDED_SLUGS,
  TEMPLATE_NOT_HELD_OBLIGATION_IDS
} from './sets/live-animals/journeys/linear/flow/template-mode.js'
import { configureSession } from './engine/persistence/session.js'
import { session } from './services/persistence/session/index.js'
import { registerJourneyCookie } from './engine/journey.js'
import { configureReadyForCheckYourAnswers } from './bridge/readiness-config.js'
import { readyForCheckYourAnswers } from './flow/section-status.js'
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
        // The readiness seam is fail-closed until L1 injects the roll-up, so
        // this hands `bridge/scope.js` the real task-row roll-up rather than
        // letting bridge import it from flow.
        configureReadyForCheckYourAnswers(SET_ID, readyForCheckYourAnswers)
        configureJourneyFlow(SET_ID, {
          sections,
          taskRows,
          rowStatus,
          nextRunTarget,
          runBackTarget,
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
        configureTemplateRecords(
          SET_ID,
          createTemplateRecords({ notHeld: TEMPLATE_NOT_HELD_OBLIGATION_IDS })
        )
        configureSession(SET_ID, session, SESSION_COOKIE_NAMES)
        registerJourneyCookie(server)
        server.ext(
          'onPreHandler',
          async (request, h) => {
            // Wrapped, not left to the onPreAuth above: authentication crosses
            // an async boundary in between, and `enterWith` does not always
            // survive it. Bare, this resolves only by the sole-set fallback and
            // throws the moment a second set mounts.
            const target = await withSetContext(SET_ID, () =>
              journeyEntryGuardTarget(request, h)
            )
            return target ? h.redirect(target).takeover() : h.continue
          },
          { sandbox: 'plugin' }
        )
        // Template mode is the same journey routes again under /templates,
        // generated from allRoutes so no page is copied. The overview twin is
        // the task list while a template is being created and the template's
        // own page once it is saved. Every other twin is checked for a template
        // the user has, and changes one section of a saved template when it is
        // reached from a Change link on that page.
        server.route(
          [
            ...allRoutes,
            ...templateModeRoutes(allRoutes, {
              excludedSlugs: TEMPLATE_MODE_EXCLUDED_SLUGS,
              overview: withTemplatePage,
              page: withTemplateChange
            })
          ].map((route) => routeWithSetContext(SET_ID, route))
        )
        // Last act of the registration: a seam this set never configured would
        // otherwise answer with its fallback at request time, and two of those
        // fallbacks are silent. Refusing here stops the server instead.
        assertSetConfigured(server, SET_ID)
      })
    }
  }
}
