// Test scaffold from docs/add-a-set.md step 7.
import { beforeAll, describe, expect, it } from 'vitest'

import { OPTIONAL } from '../../../../../bridge/status/index.js'
import { buildDispatch } from '../../../../../flow/dispatch.js'
import { configureJourneyFlow } from '../../../../../flow/journey-flow.js'
import { configureObligationSet } from '../../../../../model/obligations/manifest.js'
import {
  registerSetMount,
  withSetContext
} from '../../../../../shared/set-context.js'
import * as obligationSet from '../../../obligations/index.js'
import { rowParts, rowStatus, taskRows } from './task-rows.js'

const syntheticRow = { id: 'synthetic', pages: [{ id: 'syntheticPage' }] }

describe('plant-products task rows at m0', () => {
  beforeAll(() => {
    registerSetMount('plant-products', '/plant-products')
    configureObligationSet('plant-products', obligationSet)
    configureJourneyFlow('plant-products', {
      flowOnlyKeys: ['importType', 'declaration']
    })
    buildDispatch('plant-products', [
      {
        id: 'syntheticPage',
        slug: 'synthetic',
        collects: ['importType']
      }
    ])
  })

  it('starts with no hub task rows', () => {
    expect(taskRows).toEqual([])
  })

  it('derives fallback row parts from the page dispatch', () => {
    expect(
      withSetContext('plant-products', () => rowParts(syntheticRow))
    ).toEqual(['importType'])
  })

  it('delegates row status to the shared status bridge', () => {
    expect(
      withSetContext('plant-products', () =>
        rowStatus(syntheticRow, {}, new Set(['importType']), {})
      )
    ).toBe(OPTIONAL)
  })
})
