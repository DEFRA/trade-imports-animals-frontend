import { configureFulfilmentRegistry } from '../src/server/app/bridge/fulfilment-registry.js'
import { configureReadyForCheckYourAnswers } from '../src/server/app/bridge/readiness-config.js'
import { readyForCheckYourAnswers } from '../src/server/app/flow/section-status.js'
import { configureObligationSet } from '../src/server/app/model/obligations/manifest.js'
import { configureCommodityReference } from '../src/server/app/services/persistence/records/notification-mapper/commodity-reference.js'
import { featureEvaluationBindings } from '../src/server/app/sets/live-animals/journeys/linear/features/evaluation.js'
import * as liveAnimalsObligationSet from '../src/server/app/sets/live-animals/obligations/index.js'
import * as commodities from '../src/server/app/sets/live-animals/services/commodities/index.js'
import { configureJourneyFlow } from '../src/server/app/flow/journey-flow.js'
import {
  FLOW_ONLY_KEYS,
  sections
} from '../src/server/app/sets/live-animals/journeys/linear/flow/flow.js'
import {
  rowStatus,
  taskRows
} from '../src/server/app/sets/live-animals/journeys/linear/flow/task-rows.js'
import { sectionCaptionOf } from '../src/server/app/sets/live-animals/journeys/linear/flow/section-captions/index.js'
import { nextRunTarget } from '../src/server/app/sets/live-animals/journeys/linear/flow/run.js'
import { entryGuardTarget } from '../src/server/app/sets/live-animals/journeys/linear/flow/entry-guard.js'
import { LAYOUT } from '../src/server/app/sets/live-animals/journeys/linear/config.js'
import { registerSetMount } from '../src/server/app/shared/set-context.js'
import { SET_BASE, SET_ID } from '../src/server/app/sets/live-animals/set.js'

// Registering the mount is what lets `currentSetId()` fall back to the sole
// mounted set, so a unit test that never enters a request's set context still
// resolves to live-animals. A test that needs two sets mounts the second
// itself and enters the context explicitly.
registerSetMount(SET_ID, SET_BASE)

configureObligationSet(SET_ID, liveAnimalsObligationSet)
configureFulfilmentRegistry(SET_ID, featureEvaluationBindings)
// The readiness seam is fail-closed until it is injected, so this setup wires
// the real roll-up exactly as `routes-live-animals.js` does. A suite that wants
// a fixed answer overrides it with `configureReadyForCheckYourAnswers` of its
// own; `bridge/readiness-config.test.js` observes the default from a set id
// this setup never touches.
configureReadyForCheckYourAnswers(SET_ID, readyForCheckYourAnswers)
configureCommodityReference(SET_ID, commodities)
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
