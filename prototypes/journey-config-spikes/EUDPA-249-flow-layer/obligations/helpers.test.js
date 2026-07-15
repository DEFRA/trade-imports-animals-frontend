import { describe, it, expect } from 'vitest'
import {
  allowListed,
  anyAllowListed,
  branchedGate,
  matches,
  notInUnionOf,
  obligationMetadata,
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
      projection: groupObl.id,
      reasons: null
    })
  })

  it('merges reasons into the decision when in scope', () => {
    const reason = { code: 'x.applicable', explanation: 'because x' }
    const gate = allowListed(codeObl, ['a'], null, [reason])
    const decision = gate({ [codeObl.id]: { k1: 'a' } }, new Map())
    expect(decision).toEqual({
      inScope: true,
      records: ['k1'],
      reasons: [reason]
    })
  })

  it('does not attach reasons to out-of-scope decisions', () => {
    const reason = { code: 'x', explanation: 'y' }
    const gate = allowListed(codeObl, ['a'], null, [reason])
    const decision = gate({ [codeObl.id]: { k1: 'z' } }, new Map())
    expect(decision).toEqual({ inScope: false })
  })
})

// ---------------------------------------------------------------------------
// notInUnionOf — dual of allowListed. In scope on entries whose gate
// value is NOT in the union of a list of allowlists. Derived-union is
// computed at helper-invocation time and pinned on `.metadata.values` so
// static analysis (the reachability prover's witness synthesiser +
// browser-side controllers that inspect metadata) never has to execute
// the closure to know "would this code be admitted?".
//
// Rationale — REPORT §5.2: "notInUnionOf as a derived-union helper over
// B's .metadata.values — STRICTLY better than B's hand-restated four-
// whitelist complement, which silently double-gates if you add a fifth
// typed identifier and forget a conjunct." Phase 4 §Migration #4 lands
// the helper and migrates the two opaque `allowListedByPredicate` sites
// (identificationDetails, description) off it.
// ---------------------------------------------------------------------------

describe('notInUnionOf', () => {
  const A = ['a', 'b']
  const B = ['c', 'd']

  it('returns inScope: false when every stored key IS in the union', () => {
    const gate = notInUnionOf(codeObl, [A, B])
    const decision = gate({ [codeObl.id]: { k1: 'a', k2: 'c' } }, new Map())
    expect(decision).toEqual({ inScope: false })
  })

  it('returns records at gate level for keys whose value is NOT in the union', () => {
    const gate = notInUnionOf(codeObl, [A, B])
    const decision = gate(
      { [codeObl.id]: { k1: 'a', k2: 'z', k3: 'c', k4: 'q' } },
      new Map()
    )
    expect(decision).toEqual({ inScope: true, records: ['k2', 'k4'] })
  })

  it('projects to group instance-paths when a projection group is supplied', () => {
    const gate = notInUnionOf(codeObl, [A, B], groupObl)
    const fulfilments = { [codeObl.id]: { line1: 'z', line2: 'a' } }
    const ids = new Map([
      [groupObl.id, ['line1/unit1', 'line1/unit2', 'line2/unit1']]
    ])
    const decision = gate(fulfilments, ids)
    expect(decision).toEqual({
      inScope: true,
      records: ['line1/unit1', 'line1/unit2']
    })
  })

  it('exposes metadata.values as the union of the input allowlists (derived at helper-invocation time)', () => {
    // The load-bearing REPORT §5.2 point: the union is DATA on the
    // metadata sidecar, not a re-computation on each call. Adds a
    // fifth typed identifier to the list of allowlists → the union
    // widens; the closure body doesn't need updating.
    const gate = notInUnionOf(codeObl, [A, B], groupObl, null)
    expect(gate.metadata).toEqual({
      type: 'notInUnionOf',
      obligation: codeObl.id,
      values: ['a', 'b', 'c', 'd'],
      projection: groupObl.id,
      reasons: null
    })
  })

  it('metadata.values de-duplicates across overlapping input allowlists', () => {
    // Real manifest: PASSPORT + TATTOO share '01061900', '0102' — the
    // derived union must be a set-like list, not a bag.
    const gate = notInUnionOf(codeObl, [
      ['0101', '0102'],
      ['0102', '0103']
    ])
    expect(gate.metadata.values).toEqual(['0101', '0102', '0103'])
  })

  it('merges reasons into the decision when in scope', () => {
    const reason = { code: 'x.applicable', explanation: 'because x' }
    const gate = notInUnionOf(codeObl, [A, B], null, [reason])
    const decision = gate({ [codeObl.id]: { k1: 'z' } }, new Map())
    expect(decision).toEqual({
      inScope: true,
      records: ['k1'],
      reasons: [reason]
    })
  })

  it('does not attach reasons to out-of-scope decisions', () => {
    const reason = { code: 'x', explanation: 'y' }
    const gate = notInUnionOf(codeObl, [A, B], null, [reason])
    const decision = gate({ [codeObl.id]: { k1: 'a' } }, new Map())
    expect(decision).toEqual({ inScope: false })
  })

  it('accepts a flat list of values too (single-allowlist complement)', () => {
    // The typical shape is `notInUnionOf(gate, [listA, listB, ...])` —
    // but the helper is ergonomic-tolerant: a flat list of strings is
    // treated as a single allowlist. Keeps single-list complements
    // (e.g. "code NOT in [x, y]") a one-liner.
    const gate = notInUnionOf(codeObl, ['a', 'b'])
    expect(gate.metadata.values).toEqual(['a', 'b'])
    const decision = gate({ [codeObl.id]: { k1: 'z' } }, new Map())
    expect(decision).toEqual({ inScope: true, records: ['k1'] })
  })
})

describe('anyAllowListed', () => {
  const whenTrue = { inScope: true, status: 'mandatory' }
  const whenFalse = { inScope: false }

  it('returns whenTrue when any stored value is in the allowlist', () => {
    const gate = anyAllowListed(codeObl, ['a', 'b'], whenTrue, whenFalse)
    const decision = gate({ [codeObl.id]: { k1: 'x', k2: 'a', k3: 'y' } })
    expect(decision).toEqual(whenTrue)
  })

  it('returns whenFalse when no stored value is in the allowlist', () => {
    const gate = anyAllowListed(codeObl, ['a'], whenTrue, whenFalse)
    const decision = gate({ [codeObl.id]: { k1: 'x', k2: 'y' } })
    expect(decision).toEqual(whenFalse)
  })

  it('returns whenFalse when nothing is stored at all', () => {
    const gate = anyAllowListed(codeObl, ['a'], whenTrue, whenFalse)
    expect(gate({})).toEqual(whenFalse)
  })

  it('handles scalar stored values (not just maps)', () => {
    const gate = anyAllowListed(codeObl, ['yes'], whenTrue, whenFalse)
    expect(gate({ [codeObl.id]: 'yes' })).toEqual(whenTrue)
    expect(gate({ [codeObl.id]: 'no' })).toEqual(whenFalse)
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

// ---------------------------------------------------------------------------
// obligationMetadata — surfaces the obligation-level metadata sidecar
// (gate shape from applyTo.metadata + the new `dependsOn` schema key).
//
// Rationale: BRIEF §Migration #2 (★ highest value-per-line) + REPORT §5.1.
// Closures are opaque, so gates must declare their dependency graph as
// data alongside the closure. `dependsOn` is the schema key; the
// accessor surfaces it so a future coverage assertion (Phase 2 commit 2)
// can enforce "every gated obligation carries a complete dependsOn".
// ---------------------------------------------------------------------------

describe('obligationMetadata', () => {
  it('surfaces dependsOn from an obligation authored with the new schema key', () => {
    const obligation = {
      id: 'x-id',
      name: 'x',
      applyTo: (f) =>
        f['A'] === 'yes' ? { inScope: true } : { inScope: false },
      dependsOn: ['A', 'B']
    }
    const meta = obligationMetadata(obligation)
    expect(meta.dependsOn).toEqual(['A', 'B'])
  })

  it('returns dependsOn: undefined when the obligation omits the key', () => {
    // Commit 2 will grep this shape: "if dependsOn is undefined and the
    // obligation carries a gated applyTo, fail the coverage assertion."
    const obligation = {
      id: 'y-id',
      name: 'y',
      applyTo: () => ({ inScope: true, status: 'mandatory' })
    }
    const meta = obligationMetadata(obligation)
    expect(meta.dependsOn).toBeUndefined()
  })

  it('merges the applyTo helper sidecar (gate shape) with dependsOn', () => {
    // The helper-attached `.metadata` (allowListed/branchedGate/etc.)
    // still surfaces — dependsOn is additive, not a replacement.
    const gateObl = { id: 'gate-id' }
    const obligation = {
      id: 'z-id',
      name: 'z',
      applyTo: allowListed(gateObl, ['a']),
      dependsOn: [gateObl.id]
    }
    const meta = obligationMetadata(obligation)
    expect(meta.type).toBe('allowListed')
    expect(meta.obligation).toBe(gateObl.id)
    expect(meta.dependsOn).toEqual([gateObl.id])
  })

  it('handles obligations with no applyTo (structural / always-in-scope)', () => {
    // Group containers and unconditional obligations have no applyTo.
    // The accessor must not throw — it returns just the schema-level
    // fields (dependsOn is undefined here).
    const obligation = { id: 'g-id', name: 'g' }
    const meta = obligationMetadata(obligation)
    expect(meta.dependsOn).toBeUndefined()
  })
})
