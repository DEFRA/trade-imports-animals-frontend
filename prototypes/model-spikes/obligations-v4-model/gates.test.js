import { describe, it, expect } from 'vitest'
import {
  allowListed,
  matches,
  present,
  and,
  or,
  not,
  any,
  every
} from './gates.js'

// Synthetic obligations — enough to exercise the constructor shapes.
// Real obligations carry more (name, applyTo, etc.); constructors don't
// care about anything except identity.
const commodityCode = { id: 'commodityCode-id', name: 'commodityCode' }
const commodityLine = { id: 'commodityLine-id', name: 'commodityLine' }
const regionCodeRequirement = {
  id: 'regionCodeRequirement-id',
  name: 'regionCodeRequirement'
}

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

describe('allowListed', () => {
  it('returns a tagged data structure carrying obligation and values', () => {
    const gate = allowListed(commodityCode, ['0102', '01064100'])
    expect(gate).toEqual({
      type: 'allowListed',
      obligation: commodityCode,
      values: ['0102', '01064100']
    })
  })

  it('preserves the exact obligation reference (identity, not copy)', () => {
    const gate = allowListed(commodityCode, [])
    expect(gate.obligation).toBe(commodityCode)
  })

  it('accepts an empty values list', () => {
    const gate = allowListed(commodityCode, [])
    expect(gate.values).toEqual([])
  })
})

describe('matches', () => {
  it('returns a tagged data structure carrying obligation and value', () => {
    const gate = matches(regionCodeRequirement, 'yes')
    expect(gate).toEqual({
      type: 'matches',
      obligation: regionCodeRequirement,
      value: 'yes'
    })
  })

  it('preserves the obligation reference', () => {
    const gate = matches(regionCodeRequirement, 'yes')
    expect(gate.obligation).toBe(regionCodeRequirement)
  })

  it('accepts any value type (string, boolean, number)', () => {
    expect(matches(regionCodeRequirement, true).value).toBe(true)
    expect(matches(regionCodeRequirement, 42).value).toBe(42)
    expect(matches(regionCodeRequirement, 'x').value).toBe('x')
  })
})

describe('present', () => {
  it('returns a tagged data structure carrying the obligation', () => {
    const gate = present(commodityCode)
    expect(gate).toEqual({
      type: 'present',
      obligation: commodityCode
    })
  })

  it('preserves the obligation reference', () => {
    const gate = present(commodityCode)
    expect(gate.obligation).toBe(commodityCode)
  })
})

// ---------------------------------------------------------------------------
// Compositions
// ---------------------------------------------------------------------------

describe('and', () => {
  it('returns a tagged data structure carrying all sub-gates', () => {
    const g1 = present(commodityCode)
    const g2 = matches(regionCodeRequirement, 'yes')
    const gate = and(g1, g2)
    expect(gate).toEqual({ type: 'and', gates: [g1, g2] })
  })

  it('accepts any number of sub-gates (including one)', () => {
    const g = present(commodityCode)
    expect(and(g).gates).toEqual([g])
    expect(and(g, g, g).gates).toEqual([g, g, g])
  })

  it('accepts zero sub-gates (identity-under-conjunction)', () => {
    // and() with no sub-gates is trivially true; the resolver decides
    // how to handle it. Constructor just captures the empty list.
    expect(and().gates).toEqual([])
  })

  it('nests: and(and(a, b), c) preserves structure', () => {
    const a = present(commodityCode)
    const b = matches(regionCodeRequirement, 'yes')
    const c = allowListed(commodityCode, ['x'])
    const nested = and(and(a, b), c)
    expect(nested.gates).toHaveLength(2)
    expect(nested.gates[0]).toEqual({ type: 'and', gates: [a, b] })
    expect(nested.gates[1]).toBe(c)
  })
})

describe('or', () => {
  it('returns a tagged data structure carrying all sub-gates', () => {
    const g1 = present(commodityCode)
    const g2 = matches(regionCodeRequirement, 'yes')
    const gate = or(g1, g2)
    expect(gate).toEqual({ type: 'or', gates: [g1, g2] })
  })

  it('accepts any number of sub-gates', () => {
    const g = present(commodityCode)
    expect(or(g).gates).toEqual([g])
    expect(or().gates).toEqual([])
  })

  it('nests with and', () => {
    const a = present(commodityCode)
    const b = present(regionCodeRequirement)
    const combined = or(a, and(a, b))
    expect(combined.gates).toHaveLength(2)
    expect(combined.gates[1]).toEqual({ type: 'and', gates: [a, b] })
  })
})

describe('not', () => {
  it('returns a tagged data structure carrying the sub-gate', () => {
    const inner = allowListed(commodityCode, ['0102'])
    const gate = not(inner)
    expect(gate).toEqual({ type: 'not', gate: inner })
  })

  it('preserves the sub-gate reference', () => {
    const inner = present(commodityCode)
    expect(not(inner).gate).toBe(inner)
  })

  it('nests double negation', () => {
    const inner = present(commodityCode)
    const doubled = not(not(inner))
    expect(doubled).toEqual({ type: 'not', gate: { type: 'not', gate: inner } })
  })
})

// ---------------------------------------------------------------------------
// Projections
// ---------------------------------------------------------------------------

describe('any', () => {
  it('returns a tagged data structure carrying the indexed obligation and sub-gate', () => {
    const inner = allowListed(commodityCode, ['0102'])
    const gate = any(commodityLine, inner)
    expect(gate).toEqual({
      type: 'any',
      indexedObligation: commodityLine,
      gate: inner
    })
  })

  it('preserves references', () => {
    const inner = present(commodityCode)
    const gate = any(commodityLine, inner)
    expect(gate.indexedObligation).toBe(commodityLine)
    expect(gate.gate).toBe(inner)
  })
})

describe('every', () => {
  it('returns a tagged data structure carrying the indexed obligation and sub-gate', () => {
    const inner = matches(commodityCode, '0102')
    const gate = every(commodityLine, inner)
    expect(gate).toEqual({
      type: 'every',
      indexedObligation: commodityLine,
      gate: inner
    })
  })

  it('preserves references', () => {
    const inner = present(commodityCode)
    const gate = every(commodityLine, inner)
    expect(gate.indexedObligation).toBe(commodityLine)
    expect(gate.gate).toBe(inner)
  })
})

// ---------------------------------------------------------------------------
// Realistic composed gates from V4 (smoke tests — constructor shape only,
// no evaluation happens here)
// ---------------------------------------------------------------------------

describe('composed V4 gates (constructor shape only)', () => {
  it('CPH-shape: any(commodityLine, allowListed(commodityCode, [...]))', () => {
    const gate = any(
      commodityLine,
      allowListed(commodityCode, ['0102', '0103', '010410', '010420'])
    )
    expect(gate.type).toBe('any')
    expect(gate.indexedObligation).toBe(commodityLine)
    expect(gate.gate.type).toBe('allowListed')
    expect(gate.gate.values).toEqual(['0102', '0103', '010410', '010420'])
  })

  it('inverse-identifier-gate shape: and(not(...), not(...), not(...))', () => {
    const gate = and(
      not(allowListed(commodityCode, ['0101', '0102'])),
      not(allowListed(commodityCode, ['01061900'])),
      not(allowListed(commodityCode, ['010410']))
    )
    expect(gate.type).toBe('and')
    expect(gate.gates).toHaveLength(3)
    gate.gates.forEach((g) => {
      expect(g.type).toBe('not')
      expect(g.gate.type).toBe('allowListed')
    })
  })

  it('all-or-nothing-sibling shape: or(present(a), present(b), present(c))', () => {
    const a = { id: 'a', name: 'a' }
    const b = { id: 'b', name: 'b' }
    const c = { id: 'c', name: 'c' }
    const gate = or(present(a), present(b), present(c))
    expect(gate.type).toBe('or')
    expect(gate.gates.map((g) => g.type)).toEqual([
      'present',
      'present',
      'present'
    ])
    expect(gate.gates.map((g) => g.obligation)).toEqual([a, b, c])
  })
})
