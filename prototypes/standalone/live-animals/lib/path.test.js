import { describe, expect, it } from 'vitest'
import { deleteAt, destroyWiped, pathKey, setAt, valueAt } from './path.js'

describe('path helpers', () => {
  it('Should collapse a depth-0 path to the legacy bare id', () => {
    expect(pathKey(['commodityLines'])).toBe('commodityLines')
    expect(pathKey(['countryOfOrigin'])).toBe('countryOfOrigin')
  })

  it('Should encode indexed instance paths', () => {
    expect(pathKey(['commodityLines', 0, 'commoditySelection'])).toBe(
      'commodityLines[0].commoditySelection'
    )
    expect(pathKey(['commodityLines', 2, 'numberOfAnimalsQuantity'])).toBe(
      'commodityLines[2].numberOfAnimalsQuantity'
    )
  })

  it('Should read a value at a nested path', () => {
    const answers = {
      commodityLines: [
        { commoditySelection: '0102 - Cattle', numberOfAnimalsQuantity: '25' }
      ]
    }
    expect(valueAt(answers, ['commodityLines', 0, 'commoditySelection'])).toBe(
      '0102 - Cattle'
    )
    expect(
      valueAt(answers, ['commodityLines', 0, 'numberOfAnimalsQuantity'])
    ).toBe('25')
    expect(valueAt(answers, ['commodityLines'])).toEqual([
      { commoditySelection: '0102 - Cattle', numberOfAnimalsQuantity: '25' }
    ])
    expect(
      valueAt(answers, ['commodityLines', 5, 'commoditySelection'])
    ).toBeUndefined()
  })

  it('Should set a value at a nested path without mutating the input', () => {
    const answers = {
      commodityLines: [{ commoditySelection: '0102 - Cattle' }]
    }
    const next = setAt(
      answers,
      ['commodityLines', 0, 'numberOfAnimalsQuantity'],
      '25'
    )
    expect(next.commodityLines[0].numberOfAnimalsQuantity).toBe('25')
    expect(answers.commodityLines[0].numberOfAnimalsQuantity).toBeUndefined()
  })

  it('Should delete a leaf key at a nested path', () => {
    const answers = {
      commodityLines: [
        { commoditySelection: '0102 - Cattle', numberOfAnimalsQuantity: '25' }
      ]
    }
    deleteAt(answers, ['commodityLines', 0, 'numberOfAnimalsQuantity'])
    expect(answers.commodityLines[0]).toEqual({
      commoditySelection: '0102 - Cattle'
    })
  })

  it('Should splice an indexed entry out when the leaf is an array index', () => {
    const answers = {
      commodityLines: [{ commoditySelection: 'a' }, { commoditySelection: 'b' }]
    }
    deleteAt(answers, ['commodityLines', 0])
    expect(answers.commodityLines).toEqual([{ commoditySelection: 'b' }])
  })

  it('Should delete a whole collection at a depth-0 path (=== delete answers.id)', () => {
    const answers = {
      commodityLines: [{ commoditySelection: 'a' }],
      other: 1
    }
    deleteAt(answers, ['commodityLines'])
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
      applyWipes({ commodityLines: [{ id: 'a' }, { id: 'b' }] }, [
        'commodityLines[0]',
        'commodityLines[1]'
      ]).commodityLines
    ).toEqual([])
  })

  it('Should destroy every sibling when a whole array is wiped index-by-index', () => {
    expect(
      applyWipes({ commodityLines: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] }, [
        'commodityLines[0]',
        'commodityLines[1]',
        'commodityLines[2]'
      ]).commodityLines
    ).toEqual([])
  })

  it('Should delete a nested field before its container entry is spliced away', () => {
    // commodityLines[0].x and commodityLines[0] together: the deeper delete
    // must run first.
    const answers = { commodityLines: [{ x: '1' }, { x: '2' }] }
    applyWipes(answers, ['commodityLines[0]', 'commodityLines[0].x'])
    expect(answers.commodityLines).toEqual([{ x: '2' }])
  })

  it('Should delete a sibling array-index and a nested path in order via destroyWiped', () => {
    const answers = {
      commodityLines: [
        { commoditySelection: 'a', numberOfAnimalsQuantity: '100' },
        { commoditySelection: 'b', numberOfAnimalsQuantity: '200' }
      ],
      countryOfOrigin: 'FR'
    }
    // Mix a whole-entry array-index wipe (commodityLines[0]) with a
    // nested-leaf wipe on a LATER sibling (commodityLines[1].
    // numberOfAnimalsQuantity). The nested delete must run before the
    // splice, or renumbering would land it on the wrong entry.
    destroyWiped(answers, [
      'commodityLines[0]',
      'commodityLines[1].numberOfAnimalsQuantity'
    ])
    expect(answers).toEqual({
      commodityLines: [{ commoditySelection: 'b' }],
      countryOfOrigin: 'FR'
    })
  })
})
