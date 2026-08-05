import { configureFulfilmentRegistry } from '../src/server/app/bridge/fulfilment-registry.js'
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
import { nextRunTarget } from '../src/server/app/sets/live-animals/journeys/linear/flow/run.js'
import { entryGuardTarget } from '../src/server/app/sets/live-animals/journeys/linear/flow/entry-guard.js'
import { LAYOUT } from '../src/server/app/sets/live-animals/journeys/linear/config.js'
import { registerSetMount } from '../src/server/app/shared/set-context.js'

registerSetMount('live-animals', '/live-animals')
configureObligationSet('live-animals', liveAnimalsObligationSet)
configureFulfilmentRegistry('live-animals', featureEvaluationBindings)
configureCommodityReference('live-animals', commodities)
configureJourneyFlow('live-animals', {
  sections,
  taskRows,
  rowStatus,
  nextRunTarget,
  flowOnlyKeys: FLOW_ONLY_KEYS,
  entryGuardTarget,
  layout: LAYOUT
})
