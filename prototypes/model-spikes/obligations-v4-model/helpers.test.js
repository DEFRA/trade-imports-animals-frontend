import { describe, it, expect } from 'vitest'
import {
  allowListed,
  allowListedByPredicate,
  branchedGate,
  matches,
  present
} from './helpers.js'

// Synthetic obligations — plain data. No evaluator, no manifest, no
// obligationsById construction. This is the entire test surface.
const codeObl = { id: 'code-obl' }
const boolObl = { id: 'bool-obl' }
const groupObl = { id: 'group-obl' }

// ---------------------------------------------------------------------------
// allowListed
// ---------------------------------------------------------------------------

describe('allowListed', () => {
  it('returns inScope: false when no stored keys pass the allowlist', () => {
    const gate = allowListed(codeObl, ['a', 'b'])
    const decision = gate({ [codeObl.id]: { k1: 'x', k2: 'y' } }, new Map())
    expect(decision).toEqual({ inScope: false })
  })

  it('returns records at gate level when no projection group', () => {
    const gate = allowListed(codeObl, ['a', 'b'])
    const decision = gate(
      { [codeObl.id]: { k1: 'a', k2: 'x', k3: 'b' } },
      new Map()
    )
    expect(decision).toEqual({ inScope: true, records: ['k1', 'k3'] })
  })

  it('projects to group instance-paths when a projection group is supplied', () => {
    const gate = allowListed(codeObl, ['a'], groupObl)
    const fulfilments = { [codeObl.id]: { line1: 'a', line2: 'x' } }
    const ids = new Map([
      [groupObl.id, ['line1/unit1', 'line1/unit2', 'line2/unit1']]
    ])
    const decision = gate(fulfilments, ids)
    expect(decision).toEqual({
      inScope: true,
      records: ['line1/unit1', 'line1/unit2']
    })
  })

  it('returns empty records when the group has no instances yet', () => {
    const gate = allowListed(codeObl, ['a'], groupObl)
    const fulfilments = { [codeObl.id]: { line1: 'a' } }
    const ids = new Map()
    const decision = gate(fulfilments, ids)
    expect(decision).toEqual({ inScope: false, records: [] })
  })

  it('exposes metadata for introspection', () => {
    const gate = allowListed(codeObl, ['a', 'b'], groupObl)
    expect(gate.metadata).toEqual({
      type: 'allowListed',
      obligation: codeObl.id,
      values: ['a', 'b'],
      projection: groupObl.id
    })
  })
})

// ---------------------------------------------------------------------------
// allowListedByPredicate
// ---------------------------------------------------------------------------

describe('allowListedByPredicate', () => {
  it('filters stored entries by predicate', () => {
    const isVowel = (v) => 'aeiou'.includes(v)
    const gate = allowListedByPredicate(codeObl, isVowel)
    const decision = gate(
      { [codeObl.id]: { k1: 'a', k2: 'b', k3: 'e' } },
      new Map()
    )
    expect(decision).toEqual({ inScope: true, records: ['k1', 'k3'] })
  })

  it('projects to group instance-paths', () => {
    const isVowel = (v) => 'aeiou'.includes(v)
    const gate = allowListedByPredicate(codeObl, isVowel, groupObl)
    const fulfilments = { [codeObl.id]: { line1: 'a', line2: 'b' } }
    const ids = new Map([[groupObl.id, ['line1/unit1', 'line2/unit1']]])
    const decision = gate(fulfilments, ids)
    expect(decision).toEqual({ inScope: true, records: ['line1/unit1'] })
  })

  it('exposes metadata (predicate is opaque; projection is captured)', () => {
    const isVowel = (v) => 'aeiou'.includes(v)
    const gate = allowListedByPredicate(codeObl, isVowel, groupObl)
    expect(gate.metadata).toEqual({
      type: 'allowListedByPredicate',
      obligation: codeObl.id,
      projection: groupObl.id
    })
  })
})

// ---------------------------------------------------------------------------
// branchedGate
// ---------------------------------------------------------------------------

describe('branchedGate', () => {
  const whenTrue = { inScope: true, status: 'mandatory' }
  const whenFalse = { inScope: true, status: 'optional' }

  it('returns whenTrue when the predicate is true', () => {
    const gate = branchedGate(() => true, whenTrue, whenFalse)
    expect(gate({}, new Map())).toEqual(whenTrue)
  })

  it('returns whenFalse when the predicate is false', () => {
    const gate = branchedGate(() => false, whenTrue, whenFalse)
    expect(gate({}, new Map())).toEqual(whenFalse)
  })

  it('threads fulfilments and ids into the predicate', () => {
    let seen = null
    const gate = branchedGate(
      (f, ids) => {
        seen = { f, ids }
        return false
      },
      whenTrue,
      whenFalse
    )
    const f = { any: 'thing' }
    const ids = new Map([['k', ['v']]])
    gate(f, ids)
    expect(seen).toEqual({ f, ids })
  })
})

// ---------------------------------------------------------------------------
// matches (scalar)
// ---------------------------------------------------------------------------

describe('matches', () => {
  it('returns inScope: true when the stored value matches', () => {
    const gate = matches(boolObl, 'yes')
    expect(gate({ [boolObl.id]: 'yes' })).toEqual({ inScope: true })
  })

  it('returns inScope: false when the stored value differs', () => {
    const gate = matches(boolObl, 'yes')
    expect(gate({ [boolObl.id]: 'no' })).toEqual({ inScope: false })
  })

  it('returns inScope: false when nothing is stored', () => {
    const gate = matches(boolObl, 'yes')
    expect(gate({})).toEqual({ inScope: false })
  })
})

// ---------------------------------------------------------------------------
// present
// ---------------------------------------------------------------------------

describe('present', () => {
  it('returns true when a scalar value is stored', () => {
    expect(present(boolObl)({ [boolObl.id]: 'anything' })).toBe(true)
    expect(present(boolObl)({ [boolObl.id]: 0 })).toBe(true)
    expect(present(boolObl)({ [boolObl.id]: false })).toBe(true)
    expect(present(boolObl)({ [boolObl.id]: '' })).toBe(true)
  })

  it('returns false when nothing is stored', () => {
    expect(present(boolObl)({})).toBe(false)
    expect(present(boolObl)({ [boolObl.id]: undefined })).toBe(false)
    expect(present(boolObl)({ [boolObl.id]: null })).toBe(false)
  })

  it('returns true for indexed obligations with at least one key', () => {
    expect(present(groupObl)({ [groupObl.id]: { k1: 'v' } })).toBe(true)
  })

  it('returns false for indexed obligations with no keys', () => {
    expect(present(groupObl)({ [groupObl.id]: {} })).toBe(false)
  })
})
