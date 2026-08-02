import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { configureRecords } from './engine/persistence/records.js'
import { configureSession } from './engine/persistence/session.js'
import { store } from './engine/store.js'
import { buildDispatch } from './flow/dispatch.js'
import { configureObligationSet } from './model/obligations/manifest.js'
import { enterSetContext } from './shared/set-context.js'
import { SESSION_COOKIE_NAMES } from './sets/plant-products/journeys/linear/config.js'
import { dispatchPages } from './sets/plant-products/journeys/linear/features/index.js'
import * as plantProductsObligationSet from './sets/plant-products/obligations/index.js'
import { records as recordsStub } from './sets/plant-products/services/records/stub.js'
import { session as sessionStub } from './services/persistence/session/stub.js'

const SET_ID = 'plant-products'
let journey

describe('plant-products m0 store operations', () => {
  beforeAll(() => {
    // The global setup mounts live-animals. Enter plant here so set-keyed reads
    // cannot silently resolve that setup fixture instead of this composed set.
    enterSetContext(SET_ID)
    configureRecords(SET_ID, recordsStub)
    configureSession(SET_ID, sessionStub, SESSION_COOKIE_NAMES)
    configureObligationSet(SET_ID, plantProductsObligationSet)
    buildDispatch(SET_ID, dispatchPages)
  })

  beforeEach(async () => {
    // Vitest may resume each test from its own async context.
    enterSetContext(SET_ID)
    await store.clear()
    journey = await store.create()
  })

  // This suite has no URL-shaped values. Path-addressed collection operations
  // have no plant carrier until pp-021; pp-012 owns the depth-3 L2 fixture.
  it('Should mint a journey id and round-trip empty answers through the plant stub', async () => {
    expect(journey.journeyId).toMatch(/^GBN-PP-/)
    expect(journey.answers).toEqual({})
    expect(await store.get(journey.journeyId)).toEqual(journey)
  })

  it('Should clear the plant store', async () => {
    await store.clear()
    expect(await store.get(journey.journeyId)).toBeUndefined()
  })
})
