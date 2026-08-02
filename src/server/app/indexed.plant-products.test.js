import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { evaluateAnswers } from './bridge/evaluation.js'
import { configureFulfilmentRegistry } from './bridge/fulfilment-registry.js'
import { walkObligations } from './bridge/obligation-source.js'
import { makeScope } from './engine/index.js'
import { configureRecords } from './engine/persistence/records.js'
import { configureSession } from './engine/persistence/session.js'
import { buildDispatch } from './flow/dispatch.js'
import { configureJourneyFlow } from './flow/journey-flow.js'
import { readyForCheckYourAnswers } from './flow/section-status.js'
import { configureObligationSet } from './model/obligations/manifest.js'
import { enterSetContext } from './shared/set-context.js'
import {
  LAYOUT,
  SESSION_COOKIE_NAMES
} from './sets/plant-products/journeys/linear/config.js'
import { featureEvaluationBindings } from './sets/plant-products/journeys/linear/features/evaluation.js'
import { dispatchPages } from './sets/plant-products/journeys/linear/features/index.js'
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

describe('plant-products indexed obligations are first-class', () => {
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
    configureSession(SET_ID, sessionStub, SESSION_COOKIE_NAMES)
  })

  // Vitest may resume each test from its own async context.
  beforeEach(() => enterSetContext(SET_ID))

  // This suite has no URL-shaped values.
  it('Should enumerate every scalar plant-products obligation node', () => {
    expect([...walkObligations()]).toEqual([
      {
        obligation: plantProductsObligationSet.countryOfOrigin,
        templatePath: 'countryOfOrigin'
      },
      {
        obligation: plantProductsObligationSet.countryOfConsignment,
        templatePath: 'countryOfConsignment'
      },
      {
        obligation: plantProductsObligationSet.internalReference,
        templatePath: 'internalReference'
      },
      {
        obligation: plantProductsObligationSet.reasonForImport,
        templatePath: 'reasonForImport'
      }
    ])
  })

  it('Should place purpose after origin and before review', () => {
    expect(sections.map(({ id }) => id)).toEqual([
      'start',
      'origin',
      'purpose',
      'review'
    ])
  })

  it('Should block readiness until mandatory origin and purpose rows are complete', () => {
    expect(
      readyForCheckYourAnswers({}, makeScope({}).inScope, evaluateAnswers({}))
    ).toBe(false)
    const originOnly = { countryOfOrigin: 'FR' }
    expect(
      readyForCheckYourAnswers(
        originOnly,
        makeScope(originOnly).inScope,
        evaluateAnswers(originOnly)
      )
    ).toBe(false)
    const originCompleted = {
      countryOfOrigin: 'FR',
      countryOfConsignment: 'IE'
    }
    expect(
      readyForCheckYourAnswers(
        originCompleted,
        makeScope(originCompleted).inScope,
        evaluateAnswers(originCompleted)
      )
    ).toBe(false)
    const completed = {
      ...originCompleted,
      reasonForImport: 'INTERNAL_MARKET'
    }
    expect(
      readyForCheckYourAnswers(
        completed,
        makeScope(completed).inScope,
        evaluateAnswers(completed)
      )
    ).toBe(true)
  })
})
