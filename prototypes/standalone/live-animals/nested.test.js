import { describe, expect, it } from 'vitest'
import {
  entryComplete,
  collectionComplete
} from './engine/evaluate/complete.js'

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
