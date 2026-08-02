import { describe, expect, it } from 'vitest'

import { hubPath } from '../../../../../shared/paths.js'
import {
  registerSetMount,
  withSetContext
} from '../../../../../shared/set-context.js'
import { importTypePage } from '../features/import-type/page.js'
import { nextRunTarget, RUN_STEPS } from './run.js'

const SET_ID = 'plant-products'
const JOURNEY_ID = 'GBN-PP-26-ABC123'

registerSetMount(SET_ID, `/${SET_ID}`)

describe('plant-products opening run', () => {
  it('falls back to the plant hub after the import-type step', () => {
    const target = withSetContext(SET_ID, () =>
      nextRunTarget(importTypePage.id, {}, JOURNEY_ID)
    )

    expect(target).toBe(withSetContext(SET_ID, () => hubPath(JOURNEY_ID)))
  })

  it('returns null for an unknown step', () => {
    expect(
      withSetContext(SET_ID, () =>
        nextRunTarget('unknown-step', {}, JOURNEY_ID)
      )
    ).toBeNull()
  })

  it('contains exactly the import-type step at m0', () => {
    expect(RUN_STEPS).toHaveLength(1)
    expect(RUN_STEPS[0].id).toBe(importTypePage.id)
  })
})
