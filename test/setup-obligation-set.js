import { configureFulfilmentRegistry } from '../src/server/app/bridge/fulfilment-registry.js'
import { configureObligationSet } from '../src/server/app/model/obligations/manifest.js'
import { configureCommodityReference } from '../src/server/app/services/persistence/records/notification-mapper/commodity-reference.js'
import { featureEvaluationBindings } from '../src/server/app/sets/live-animals/journeys/linear/features/evaluation.js'
import * as liveAnimalsObligationSet from '../src/server/app/sets/live-animals/obligations/index.js'
import * as commodities from '../src/server/app/sets/live-animals/services/commodities/index.js'

configureObligationSet(liveAnimalsObligationSet)
configureFulfilmentRegistry(featureEvaluationBindings)
configureCommodityReference(commodities)
