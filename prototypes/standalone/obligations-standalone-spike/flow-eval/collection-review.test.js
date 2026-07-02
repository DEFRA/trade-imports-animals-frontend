import { describe, expect, it } from 'vitest'
import { isReviewedEmptyCollection } from './collection-review.js'
import { loadJourneyModel } from '../engine/index.js'

// claimType's committed id, resolved by name so no UUID is hardcoded.
const ID = loadJourneyModel().identifiers.idOf('claimType')

describe('flow-eval/collection-review — the reviewed-empty marker', () => {
  it('is true for an empty collection whose envelope is stored', () => {
    const obligation = { fulfilled: false, fulfilments: [] }
    expect(isReviewedEmptyCollection(ID, obligation, { [ID]: {} })).toBe(true)
  })

  it('is false for an empty collection never continued past', () => {
    const obligation = { fulfilled: false, fulfilments: [] }
    expect(isReviewedEmptyCollection(ID, obligation, {})).toBe(false)
    expect(isReviewedEmptyCollection(ID, obligation)).toBe(false)
  })

  it('is false once the collection has rows (fulfilled-ness rules then)', () => {
    const obligation = {
      fulfilled: true,
      fulfilments: [{ fulfilmentId: 'f-1', fulfilled: true }]
    }
    expect(
      isReviewedEmptyCollection(ID, obligation, { [ID]: { 'f-1': {} } })
    ).toBe(false)
  })

  it('is false for single-cardinality obligations (no fulfilments array)', () => {
    const obligation = { fulfilled: false }
    expect(isReviewedEmptyCollection(ID, obligation, { [ID]: {} })).toBe(false)
  })
})
