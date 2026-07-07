import { describe, expect, it } from 'vitest'
import { deleteAt, destroyWiped, pathKey, setAt, valueAt } from './path.js'

describe('path helpers', () => {
  it('Should collapse a depth-0 path to the legacy bare id', () => {
    expect(pathKey(['claims'])).toBe('claims')
    expect(pathKey(['fullName'])).toBe('fullName')
  })

  it('Should encode indexed instance paths', () => {
    expect(pathKey(['claims', 0, 'claimType'])).toBe('claims[0].claimType')
    expect(pathKey(['claims', 2, 'claimAmount'])).toBe('claims[2].claimAmount')
  })

  it('Should read a value at a nested path', () => {
    const answers = { claims: [{ claimType: 'accident', claimAmount: '500' }] }
    expect(valueAt(answers, ['claims', 0, 'claimType'])).toBe('accident')
    expect(valueAt(answers, ['claims', 0, 'claimAmount'])).toBe('500')
    expect(valueAt(answers, ['claims'])).toEqual([
      { claimType: 'accident', claimAmount: '500' }
    ])
    expect(valueAt(answers, ['claims', 5, 'claimType'])).toBeUndefined()
  })

  it('Should set a value at a nested path without mutating the input', () => {
    const answers = { claims: [{ claimType: 'accident' }] }
    const next = setAt(answers, ['claims', 0, 'claimAmount'], '500')
    expect(next.claims[0].claimAmount).toBe('500')
    expect(answers.claims[0].claimAmount).toBeUndefined()
  })

  it('Should delete a leaf key at a nested path', () => {
    const answers = { claims: [{ claimType: 'accident', claimAmount: '500' }] }
    deleteAt(answers, ['claims', 0, 'claimAmount'])
    expect(answers.claims[0]).toEqual({ claimType: 'accident' })
  })

  it('Should splice an indexed entry out when the leaf is an array index', () => {
    const answers = { claims: [{ claimType: 'a' }, { claimType: 'b' }] }
    deleteAt(answers, ['claims', 0])
    expect(answers.claims).toEqual([{ claimType: 'b' }])
  })

  it('Should delete a whole collection at a depth-0 path (=== delete answers.id)', () => {
    const answers = { claims: [{ claimType: 'a' }], other: 1 }
    deleteAt(answers, ['claims'])
    expect(answers).toEqual({ other: 1 })
  })
})

describe('wipeOrder — sibling-safe deletion order', () => {
  // Drive the REAL exported `destroyWiped` rather than re-deriving its
  // map/sort/delete body inline.
  const applyWipes = (answers, keys) => {
    destroyWiped(answers, keys)
    return answers
  }

  it('Should destroy both siblings when two array indices are wiped', () => {
    expect(
      applyWipes({ claims: [{ id: 'a' }, { id: 'b' }] }, [
        'claims[0]',
        'claims[1]'
      ]).claims
    ).toEqual([])
  })

  it('Should destroy every sibling when a whole array is wiped index-by-index', () => {
    expect(
      applyWipes({ claims: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] }, [
        'claims[0]',
        'claims[1]',
        'claims[2]'
      ]).claims
    ).toEqual([])
  })

  it('Should delete a nested field before its container entry is spliced away', () => {
    // claims[0].x and claims[0] together: the deeper delete must run first.
    const answers = { claims: [{ x: '1' }, { x: '2' }] }
    applyWipes(answers, ['claims[0]', 'claims[0].x'])
    expect(answers.claims).toEqual([{ x: '2' }])
  })

  it('Should delete a sibling array-index and a nested path in order via destroyWiped', () => {
    const answers = {
      claims: [
        { claimType: 'a', claimAmount: '100' },
        { claimType: 'b', claimAmount: '200' }
      ],
      email: 'x@y.com'
    }
    // Mix a whole-entry array-index wipe (claims[0]) with a nested-leaf wipe on
    // a LATER sibling (claims[1].claimAmount). The nested delete must run before
    // the splice, or renumbering would land it on the wrong entry.
    destroyWiped(answers, ['claims[0]', 'claims[1].claimAmount'])
    expect(answers).toEqual({
      claims: [{ claimType: 'b' }],
      email: 'x@y.com'
    })
  })
})
