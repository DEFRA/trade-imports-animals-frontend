import { describe, expect, it } from 'vitest'
import { deleteAt, parsePath, pathKey, setAt, valueAt } from './path.js'
import { wipeOrder } from '../engine/index.js'

/**
 * Path helpers — the address vocabulary that lets reconcile/status/store
 * descend into indexed collections. The DEPTH-0 COLLAPSE (a single-segment
 * path stringifies to the bare id) is the zero-DOM compatibility keystone:
 * every existing `scope.has('claims')` keeps working unchanged.
 */
describe('path helpers', () => {
  it('collapses a depth-0 path to the legacy bare id', () => {
    expect(pathKey(['claims'])).toBe('claims')
    expect(pathKey(['fullName'])).toBe('fullName')
  })

  it('encodes indexed instance paths', () => {
    expect(pathKey(['claims', 0, 'claimType'])).toBe('claims[0].claimType')
    expect(pathKey(['claims', 2, 'claimAmount'])).toBe('claims[2].claimAmount')
  })

  it('reads a value at a nested path', () => {
    const answers = { claims: [{ claimType: 'accident', claimAmount: '500' }] }
    expect(valueAt(answers, ['claims', 0, 'claimType'])).toBe('accident')
    expect(valueAt(answers, ['claims', 0, 'claimAmount'])).toBe('500')
    expect(valueAt(answers, ['claims'])).toEqual([
      { claimType: 'accident', claimAmount: '500' }
    ])
    expect(valueAt(answers, ['claims', 5, 'claimType'])).toBeUndefined()
  })

  it('sets a value at a nested path without mutating the input', () => {
    const answers = { claims: [{ claimType: 'accident' }] }
    const next = setAt(answers, ['claims', 0, 'claimAmount'], '500')
    expect(next.claims[0].claimAmount).toBe('500')
    expect(answers.claims[0].claimAmount).toBeUndefined() // input untouched
  })

  it('deletes a leaf key at a nested path', () => {
    const answers = { claims: [{ claimType: 'accident', claimAmount: '500' }] }
    deleteAt(answers, ['claims', 0, 'claimAmount'])
    expect(answers.claims[0]).toEqual({ claimType: 'accident' })
  })

  it('splices an indexed entry out when the leaf is an array index', () => {
    const answers = { claims: [{ claimType: 'a' }, { claimType: 'b' }] }
    deleteAt(answers, ['claims', 0])
    expect(answers.claims).toEqual([{ claimType: 'b' }])
  })

  it('deletes a whole collection at a depth-0 path (=== delete answers.id)', () => {
    const answers = { claims: [{ claimType: 'a' }], other: 1 }
    deleteAt(answers, ['claims'])
    expect(answers).toEqual({ other: 1 })
  })
})

/**
 * `wipeOrder` (commit's delete comparator) must order sibling array-index
 * deletes HIGHEST-INDEX-FIRST — a splice renumbers later siblings, so deleting
 * index 0 before index 1 would leave the second entry alive. This is inert in
 * Phase 1 (only the whole `claims` root is wipeOnExit) but goes live in Phase 3's
 * item-scoped wipes, so it is pinned now while the code is fresh.
 */
describe('wipeOrder — sibling-safe deletion order', () => {
  const applyWipes = (answers, keys) => {
    for (const path of keys.map(parsePath).sort(wipeOrder)) {
      deleteAt(answers, path)
    }
    return answers
  }

  it('destroys BOTH siblings when two array indices are wiped', () => {
    expect(
      applyWipes({ claims: [{ id: 'a' }, { id: 'b' }] }, [
        'claims[0]',
        'claims[1]'
      ]).claims
    ).toEqual([])
  })

  it('destroys every sibling when a whole array is wiped index-by-index', () => {
    expect(
      applyWipes({ claims: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] }, [
        'claims[0]',
        'claims[1]',
        'claims[2]'
      ]).claims
    ).toEqual([])
  })

  it('deletes a nested field before its container entry is spliced away', () => {
    // claims[0].x and claims[0] together: the deeper delete must run first.
    const answers = { claims: [{ x: '1' }, { x: '2' }] }
    applyWipes(answers, ['claims[0]', 'claims[0].x'])
    expect(answers.claims).toEqual([{ x: '2' }])
  })
})
