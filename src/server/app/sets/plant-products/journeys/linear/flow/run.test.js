import { beforeAll, describe, expect, it } from 'vitest'

import { configureFulfilmentRegistry } from '../../../../../bridge/fulfilment-registry.js'
import { makeScope } from '../../../../../engine/index.js'
import { buildDispatch } from '../../../../../flow/dispatch.js'
import { configureJourneyFlow } from '../../../../../flow/journey-flow.js'
import { configureObligationSet } from '../../../../../model/obligations/manifest.js'
import { hubPath, pagePath } from '../../../../../shared/paths.js'
import {
  registerSetMount,
  withSetContext
} from '../../../../../shared/set-context.js'
import { importTypePage } from '../features/import-type/page.js'
import { featureEvaluationBindings } from '../features/evaluation.js'
import { dispatchPages } from '../features/index.js'
import { countryOfOriginPage } from '../features/origin/page.js'
import * as obligationSet from '../../../obligations/index.js'
import { FLOW_ONLY_KEYS, sections } from './flow.js'
import { nextRunTarget, RUN_STEPS } from './run.js'
import { rowStatus, taskRows } from './task-rows.js'

const SET_ID = 'plant-products'
const JOURNEY_ID = 'GBN-PP-26-ABC123'

registerSetMount(SET_ID, `/${SET_ID}`)

describe('plant-products opening run', () => {
  beforeAll(() => {
    configureObligationSet(SET_ID, obligationSet)
    configureFulfilmentRegistry(SET_ID, featureEvaluationBindings)
    configureJourneyFlow(SET_ID, {
      sections,
      taskRows,
      rowStatus,
      flowOnlyKeys: FLOW_ONLY_KEYS
    })
    buildDispatch(SET_ID, dispatchPages)
  })

  it('routes from import type to country of origin and then falls back to the hub', () => {
    const targets = withSetContext(SET_ID, () => ({
      afterImportType: nextRunTarget(
        importTypePage.id,
        makeScope({}),
        JOURNEY_ID
      ),
      afterCountry: nextRunTarget(
        countryOfOriginPage.id,
        makeScope({ countryOfOrigin: 'FR' }),
        JOURNEY_ID
      )
    }))

    expect(targets).toEqual(
      withSetContext(SET_ID, () => ({
        afterImportType: pagePath(JOURNEY_ID, countryOfOriginPage.slug),
        afterCountry: hubPath(JOURNEY_ID)
      }))
    )
  })

  it('returns null for an unknown step', () => {
    expect(
      withSetContext(SET_ID, () =>
        nextRunTarget('unknown-step', {}, JOURNEY_ID)
      )
    ).toBeNull()
  })

  it('contains import type followed by country of origin', () => {
    expect(RUN_STEPS.map(({ id }) => id)).toEqual([
      importTypePage.id,
      countryOfOriginPage.id
    ])
  })
})
