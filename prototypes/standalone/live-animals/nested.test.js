import { describe, expect, it } from 'vitest'
import {
  entryComplete,
  collectionComplete
} from './engine/evaluate/complete.js'

/**
 * The engine supports nested (depth-2) collections — a collection item may
 * itself hold another collection. The car named-driver feature
 * (`drivers[i].claims[j]`) was the live carrier and was removed with its
 * section, taking the depth-2 SCOPE and dispatch-coverage witnesses with it.
 * No live obligation nests a collection until M2 adds one, so the depth-2
 * mechanics are exercised here with synthetic obligations only — the engine
 * capability stays; only the car carrier went (see docs/limits.md).
 */
describe('nested collection completeness (synthetic — no live carrier)', () => {
  it('Should gate the parent on a required nested collection', () => {
    const requiredNested = {
      id: 'x',
      collection: true,
      item: [{ id: 'y', required: true }],
      requiredAtLeastOne: true
    }
    const parent = { id: 'p', item: [requiredNested] }
    expect(entryComplete(parent, { x: [] })).toBe(false)
    expect(entryComplete(parent, { x: [{ y: 'ok' }] })).toBe(true)
  })

  it('Should treat a required nested entry with a blank field as incomplete', () => {
    const requiredNested = {
      id: 'x',
      collection: true,
      item: [{ id: 'y', required: true }],
      requiredAtLeastOne: true
    }
    expect(collectionComplete(requiredNested, [{ y: '' }])).toBe(false)
  })
})
