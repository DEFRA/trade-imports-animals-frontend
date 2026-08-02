// Test scaffold from docs/add-a-set.md step 7.
import { beforeAll, describe, expect, it } from 'vitest'

import { evaluateAnswers } from '../../../../../bridge/evaluation.js'
import { configureFulfilmentRegistry } from '../../../../../bridge/fulfilment-registry.js'
import { FULFILLED, NOT_STARTED } from '../../../../../bridge/status/index.js'
import { makeScope } from '../../../../../engine/index.js'
import { buildDispatch } from '../../../../../flow/dispatch.js'
import { configureJourneyFlow } from '../../../../../flow/journey-flow.js'
import { rowEntry } from '../../../../../flow/navigation.js'
import { readyForCheckYourAnswers } from '../../../../../flow/section-status.js'
import { configureObligationSet } from '../../../../../model/obligations/manifest.js'
import {
  registerSetMount,
  withSetContext
} from '../../../../../shared/set-context.js'
import * as obligationSet from '../../../obligations/index.js'
import { featureEvaluationBindings } from '../features/evaluation.js'
import { dispatchPages } from '../features/index.js'
import { countryOfOriginPage } from '../features/origin/page.js'
import { FLOW_ONLY_KEYS, sections } from './flow.js'
import { rowParts, rowStatus, taskRowById, taskRows } from './task-rows.js'

describe('plant-products task rows', () => {
  beforeAll(() => {
    registerSetMount('plant-products', '/plant-products')
    configureObligationSet('plant-products', obligationSet)
    configureFulfilmentRegistry('plant-products', featureEvaluationBindings)
    configureJourneyFlow('plant-products', {
      sections,
      taskRows,
      rowStatus,
      flowOnlyKeys: FLOW_ONLY_KEYS
    })
    buildDispatch('plant-products', dispatchPages)
  })

  it('registers origin as the first row and enters country-of-origin', () => {
    expect(taskRows).toEqual([{ id: 'origin', pages: [countryOfOriginPage] }])
    expect(
      withSetContext('plant-products', () =>
        rowEntry(taskRowById('origin'), makeScope({}), 'journey-1')
      )
    ).toBe('/plant-products/notifications/journey-1/country-of-origin')
  })

  it('derives fallback row parts from the page dispatch', () => {
    expect(
      withSetContext('plant-products', () => rowParts(taskRowById('origin')))
    ).toEqual(['countryOfOrigin'])
  })

  it('moves the mandatory origin row from Not yet started to Completed', () => {
    const statusFor = (answers) =>
      withSetContext('plant-products', () => {
        const { inScope } = makeScope(answers)
        return rowStatus(
          taskRowById('origin'),
          answers,
          inScope,
          evaluateAnswers(answers)
        )
      })

    expect(statusFor({})).toBe(NOT_STARTED)
    expect(statusFor({ countryOfOrigin: 'FR' })).toBe(FULFILLED)
  })

  it('blocks readiness until the mandatory origin row is complete', () => {
    const readyFor = (answers) =>
      withSetContext('plant-products', () => {
        const { inScope } = makeScope(answers)
        return readyForCheckYourAnswers(
          answers,
          inScope,
          evaluateAnswers(answers)
        )
      })

    expect(readyFor({})).toBe(false)
    expect(readyFor({ countryOfOrigin: 'FR' })).toBe(true)
  })
})
