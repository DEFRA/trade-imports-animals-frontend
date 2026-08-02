// R7: paths POSTed by this harness are route shapes, so they stay prefix-free
// and Hapi supplies the mount. Any asserted emitted link or redirect target is
// different: it must carry /plant-products. The empty m0 table has neither.
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { configureFulfilmentRegistry } from './bridge/fulfilment-registry.js'
import {
  obligationByName,
  walkObligations
} from './bridge/obligation-source.js'
import { configureRecords } from './engine/persistence/records.js'
import { configureSession } from './engine/persistence/session.js'
import { store } from './engine/store.js'
import { driveHandler, postHandlerOf } from './engine/test-support.js'
import { buildDispatch } from './flow/dispatch.js'
import { configureJourneyFlow } from './flow/journey-flow.js'
import { isAnswered } from './lib/answered.js'
import { configureObligationSet } from './model/obligations/manifest.js'
import { enterSetContext } from './shared/set-context.js'
import {
  LAYOUT,
  SESSION_COOKIE_NAMES
} from './sets/plant-products/journeys/linear/config.js'
import { featureEvaluationBindings } from './sets/plant-products/journeys/linear/features/evaluation.js'
import { dispatchPages } from './sets/plant-products/journeys/linear/features/index.js'
import * as importType from './sets/plant-products/journeys/linear/features/import-type/controller.js'
import * as countryOfOrigin from './sets/plant-products/journeys/linear/features/origin/country-of-origin/country-of-origin.controller.js'
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
import { records as recordsStub } from './sets/plant-products/services/records/stub.js'
import { session as sessionStub } from './services/persistence/session/stub.js'

const SET_ID = 'plant-products'
const drive = driveHandler
let committableKeys = []
let flowOnlyWrites = []

const committedIds = ({ before, after }) => [
  ...committableKeys.filter(
    (id) => isAnswered(after[id]) && !isAnswered(before[id])
  ),
  ...Object.keys(flowOnlyWrites.at(-1) ?? {})
]

const committableCollects = (collects) =>
  collects.filter((id) => {
    const obligation = obligationByName(id)
    return (
      FLOW_ONLY_KEYS.includes(id) ||
      (obligation && !obligation.renderOnly && !obligation.system)
    )
  })

// T-5 standing rule: every collecting plant controller adds a valid POST case.
const cases = [
  {
    id: importType.meta.id,
    collects: importType.meta.collects,
    controller: importType,
    payload: { importType: 'plants' }
  },
  {
    id: countryOfOrigin.meta.id,
    collects: countryOfOrigin.meta.collects,
    controller: countryOfOrigin,
    payload: { countryOfOrigin: 'FR' }
  }
]

describe('plant-products controller <-> model commit contract', () => {
  beforeAll(() => {
    // The global setup mounts live-animals. Enter plant here so set-keyed reads
    // cannot silently resolve that setup fixture instead of this composed set.
    enterSetContext(SET_ID)
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
    buildDispatch(SET_ID, dispatchPages)
    configureRecords(SET_ID, recordsStub)
    configureSession(
      SET_ID,
      {
        ...sessionStub,
        setFlowOnlyAnswers: vi.fn(async (...args) => {
          const values = await sessionStub.setFlowOnlyAnswers(...args)
          flowOnlyWrites.push(values)
          return values
        })
      },
      SESSION_COOKIE_NAMES
    )
    committableKeys = [...walkObligations()].map((node) => node.obligation.name)
  })

  beforeEach(async () => {
    // Vitest may resume each test from its own async context.
    enterSetContext(SET_ID)
    await store.clear()
    flowOnlyWrites = []
  })

  it.each(cases)(
    'Should commit exactly the committable collects for $id',
    async ({ collects, controller, payload, seed }) => {
      const result = await drive(postHandlerOf(controller), { payload, seed })
      expect(new Set(committedIds(result))).toEqual(
        new Set(committableCollects(collects))
      )
    }
  )

  it('Should carry a contract case for every collecting plant controller', () => {
    const collectingControllerIds = dispatchPages
      .filter((page) => committableCollects(page.collects ?? []).length > 0)
      .map(({ id }) => id)
    expect(cases.map(({ id }) => id)).toEqual(collectingControllerIds)
  })
})
