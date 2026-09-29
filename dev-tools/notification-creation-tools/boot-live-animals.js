/**
 * Minimum set-boot for the staleness scenarios to run outside the Hapi server.
 * Mirrors `test/setup-obligation-set.js` (which does the same for vitest) —
 * only the seams the scenarios actually use are wired: obligation set,
 * fulfilment registry, and the set-mount fallback so `currentSetId()` resolves
 * without a request in flight.
 */
import { configureFulfilmentRegistry } from '../../src/server/app/bridge/fulfilment-registry.js'
import { configureObligationSet } from '../../src/server/app/model/obligations/manifest.js'
import { featureEvaluationBindings } from '../../src/server/app/sets/live-animals/journeys/linear/features/evaluation.js'
import * as liveAnimalsObligationSet from '../../src/server/app/sets/live-animals/obligations/index.js'
import { registerSetMount } from '../../src/server/app/shared/set-context.js'
import { SET_BASE, SET_ID } from '../../src/server/app/sets/live-animals/set.js'

registerSetMount(SET_ID, SET_BASE)
configureObligationSet(SET_ID, liveAnimalsObligationSet)
configureFulfilmentRegistry(SET_ID, featureEvaluationBindings)
