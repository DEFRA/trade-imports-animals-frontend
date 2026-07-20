import { describe, it, expect } from 'vitest'
import {
  allowListed,
  alwaysInScope,
  anyAllowListed,
  branchedGate,
  equalsGate,
  includesGate,
  matches,
  notInUnionOf,
  obligationMetadata,
  present,
  presentGate,
  presentPerRecord
} from './helpers.js'
import { isRecordMap, readGate } from './helper-internals.js'

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

// ---------------------------------------------------------------------------
// Meta-first gate helpers — EUDPA-288 Phase 4.5.1.
//
// The `regionCode` / `purposeInInternalMarket` / `commercialTransporter`
// pattern under Phase 3.2 declares its dependency THREE times: closure
// body reads `fulfilments[X.id]`, `predicateMeta` restates that as
// `{operator:'equals', obligationId:X.id, value:V}`, and `dependsOn`
// restates it a third time as `[X.id]`. These helpers collapse the
// duplication: the metadata IS the definition, the closure body is
// auto-generated. Phase 4.5.2 will migrate the 10 sites; this commit
// only introduces the helpers (purely additive).
//
// Frame semantics: all four helpers use the SAME-FRAME scalar-read
// pattern used by `matches` / `anyAllowListed` / `branchedGate` — no
// `filterAndProject`, no projection group, no `fulfilmentIdsByObligationId`
// touch. The migration sites (regionCode etc.) are all notification-
// level scalar gates; if a future depth-N call site emerges,
// `allowListed`'s projection pattern is the escape hatch.
// ---------------------------------------------------------------------------

describe('equalsGate', () => {
  const whenTrue = { inScope: true, status: 'mandatory' }
  const whenFalse = { inScope: true, status: 'optional' }

  it('returns whenTrue when the stored value equals the target', () => {
    const gate = equalsGate(boolObl, 'yes', whenTrue, whenFalse)
    expect(gate({ [boolObl.id]: 'yes' })).toEqual(whenTrue)
  })

  it('returns whenFalse when the stored value differs', () => {
    const gate = equalsGate(boolObl, 'yes', whenTrue, whenFalse)
    expect(gate({ [boolObl.id]: 'no' })).toEqual(whenFalse)
  })

  it('returns whenFalse when nothing is stored', () => {
    const gate = equalsGate(boolObl, 'yes', whenTrue, whenFalse)
    expect(gate({})).toEqual(whenFalse)
  })

  it('handles status flip (mandatory → optional) — regionCode shape', () => {
    // regionCode uses `whenTrue: {inScope:true, status:'mandatory'}` +
    // `whenFalse: {inScope:true, status:'optional'}`. Both branches
    // in-scope; only status flips. The helper must pass through
    // whichever decision object the caller supplied verbatim.
    const reason = { code: 'r.applicable', explanation: 'r' }
    const gate = equalsGate(
      boolObl,
      'yes',
      { inScope: true, status: 'mandatory', reasons: [reason] },
      { inScope: true, status: 'optional' }
    )
    expect(gate({ [boolObl.id]: 'yes' })).toEqual({
      inScope: true,
      status: 'mandatory',
      reasons: [reason]
    })
    expect(gate({ [boolObl.id]: 'no' })).toEqual({
      inScope: true,
      status: 'optional'
    })
  })

  it('exposes metadata with obligationId + value + branches', () => {
    const gate = equalsGate(boolObl, 'yes', whenTrue, whenFalse)
    expect(gate.metadata).toEqual({
      type: 'equalsGate',
      obligation: boolObl.id,
      value: 'yes',
      whenTrue,
      whenFalse
    })
  })
})

describe('presentGate', () => {
  const whenTrue = { inScope: true, status: 'mandatory' }
  const whenFalse = { inScope: true, status: 'optional' }

  it('returns whenTrue when the gate has any scalar value', () => {
    const gate = presentGate(boolObl, whenTrue, whenFalse)
    expect(gate({ [boolObl.id]: 'anything' })).toEqual(whenTrue)
  })

  it('returns whenTrue for truthy-but-falsy values (0, false, "")', () => {
    // Matches `present`'s semantics: any non-null/non-undefined scalar
    // counts as "answered". Empty-string is a stored answer (the user
    // saved the page blank), which regionCode's status-swap needs to
    // treat as present.
    const gate = presentGate(boolObl, whenTrue, whenFalse)
    expect(gate({ [boolObl.id]: 0 })).toEqual(whenTrue)
    expect(gate({ [boolObl.id]: false })).toEqual(whenTrue)
    expect(gate({ [boolObl.id]: '' })).toEqual(whenTrue)
  })

  it('returns whenFalse when the gate is undefined / null', () => {
    const gate = presentGate(boolObl, whenTrue, whenFalse)
    expect(gate({})).toEqual(whenFalse)
    expect(gate({ [boolObl.id]: undefined })).toEqual(whenFalse)
    expect(gate({ [boolObl.id]: null })).toEqual(whenFalse)
  })

  it('returns whenTrue for indexed obligations with at least one key', () => {
    const gate = presentGate(groupObl, whenTrue, whenFalse)
    expect(gate({ [groupObl.id]: { k1: 'v' } })).toEqual(whenTrue)
  })

  it('returns whenFalse for indexed obligations with no keys', () => {
    const gate = presentGate(groupObl, whenTrue, whenFalse)
    expect(gate({ [groupObl.id]: {} })).toEqual(whenFalse)
  })

  it('exposes metadata with obligationId + branches (no value)', () => {
    const gate = presentGate(boolObl, whenTrue, whenFalse)
    expect(gate.metadata).toEqual({
      type: 'presentGate',
      obligation: boolObl.id,
      whenTrue,
      whenFalse
    })
  })
})

// ---------------------------------------------------------------------------
// presentPerRecord — blankness is the MODEL's `isBlankValue`, the same
// predicate the engine's fulfilment checks use, so a value can never be
// "filled" to the classifier while the gate it opens stays shut (or vice
// versa). Deliberate consequence pinned below: a whitespace-only string
// opens the gate (non-blank to the model), unlike the app-side
// `isAnswered`, which trims.
// ---------------------------------------------------------------------------

describe('presentPerRecord', () => {
  it('opens per record where the gate value is non-blank, closes elsewhere', () => {
    const gate = presentPerRecord(codeObl, null)
    const decision = gate(
      { [codeObl.id]: { doc1: 'ITAHC', doc2: '', doc3: null } },
      new Map()
    )
    expect(decision).toEqual({ inScope: true, records: ['doc1'] })
  })

  it('returns inScope: false when every record value is blank', () => {
    const gate = presentPerRecord(codeObl, null)
    const decision = gate(
      { [codeObl.id]: { doc1: '', doc2: undefined } },
      new Map()
    )
    expect(decision).toEqual({ inScope: false })
  })

  it('treats all-blank composite values (date parts) as unanswered', () => {
    const gate = presentPerRecord(codeObl, null)
    const decision = gate(
      {
        [codeObl.id]: {
          doc1: { day: '', month: '', year: '' },
          doc2: { day: '01', month: '06', year: '2026' }
        }
      },
      new Map()
    )
    expect(decision).toEqual({ inScope: true, records: ['doc2'] })
  })

  it('opens on a whitespace-only string (model isBlankValue, not app isAnswered)', () => {
    const gate = presentPerRecord(codeObl, null)
    const decision = gate({ [codeObl.id]: { doc1: ' ' } }, new Map())
    expect(decision).toEqual({ inScope: true, records: ['doc1'] })
  })

  it('projects to group instance-paths when a projection group is supplied', () => {
    const gate = presentPerRecord(codeObl, groupObl)
    const fulfilments = { [codeObl.id]: { line1: 'answered', line2: '' } }
    const ids = new Map([
      [groupObl.id, ['line1/unit1', 'line1/unit2', 'line2/unit1']]
    ])
    expect(gate(fulfilments, ids)).toEqual({
      inScope: true,
      records: ['line1/unit1', 'line1/unit2']
    })
  })

  it('merges reasons into in-scope decisions only', () => {
    const reason = { code: 'x.applicable', explanation: 'because x' }
    const gate = presentPerRecord(codeObl, null, [reason])
    expect(gate({ [codeObl.id]: { doc1: 'v' } }, new Map())).toEqual({
      inScope: true,
      records: ['doc1'],
      reasons: [reason]
    })
    expect(gate({ [codeObl.id]: { doc1: '' } }, new Map())).toEqual({
      inScope: false
    })
  })

  it('exposes metadata for introspection', () => {
    const gate = presentPerRecord(codeObl, groupObl)
    expect(gate.metadata).toEqual({
      type: 'presentPerRecord',
      obligation: codeObl.id,
      projection: groupObl.id,
      reasons: null
    })
  })
})

describe('includesGate', () => {
  const whenTrue = { inScope: true, status: 'optional' }
  const whenFalse = { inScope: false }
  const LAND_MODES = ['railway', 'road-vehicle']

  it('returns whenTrue when the stored value is in the list', () => {
    const gate = includesGate(boolObl, LAND_MODES, whenTrue, whenFalse)
    expect(gate({ [boolObl.id]: 'railway' })).toEqual(whenTrue)
    expect(gate({ [boolObl.id]: 'road-vehicle' })).toEqual(whenTrue)
  })

  it('returns whenFalse when the stored value is not in the list', () => {
    const gate = includesGate(boolObl, LAND_MODES, whenTrue, whenFalse)
    expect(gate({ [boolObl.id]: 'sea' })).toEqual(whenFalse)
  })

  it('returns whenFalse when nothing is stored', () => {
    const gate = includesGate(boolObl, LAND_MODES, whenTrue, whenFalse)
    expect(gate({})).toEqual(whenFalse)
  })

  it('exposes metadata with obligationId + values + branches', () => {
    const gate = includesGate(boolObl, LAND_MODES, whenTrue, whenFalse)
    expect(gate.metadata).toEqual({
      type: 'includesGate',
      obligation: boolObl.id,
      values: LAND_MODES,
      whenTrue,
      whenFalse
    })
  })
})

describe('alwaysInScope', () => {
  it('returns a fixed decision with the given status', () => {
    const gate = alwaysInScope('mandatory')
    expect(gate({})).toEqual({ inScope: true, status: 'mandatory' })
    // The stored view doesn't matter — same decision.
    expect(gate({ any: 'thing' })).toEqual({
      inScope: true,
      status: 'mandatory'
    })
  })

  it('attaches reasons when provided', () => {
    const reason = { code: 'x', explanation: 'y' }
    const gate = alwaysInScope('mandatory', [reason])
    expect(gate({})).toEqual({
      inScope: true,
      status: 'mandatory',
      reasons: [reason]
    })
  })

  it('supports optional status too', () => {
    const gate = alwaysInScope('optional')
    expect(gate({})).toEqual({ inScope: true, status: 'optional' })
  })

  it('exposes metadata with status (+ optional reasons)', () => {
    const gate = alwaysInScope('mandatory')
    expect(gate.metadata).toEqual({
      type: 'alwaysInScope',
      status: 'mandatory',
      reasons: null
    })
    const gateWithReasons = alwaysInScope('mandatory', [
      { code: 'x', explanation: 'y' }
    ])
    expect(gateWithReasons.metadata).toEqual({
      type: 'alwaysInScope',
      status: 'mandatory',
      reasons: [{ code: 'x', explanation: 'y' }]
    })
  })
})

// ---------------------------------------------------------------------------
// Shared internals — isRecordMap / readGate. Phase 4.6.4 (Q4).
//
// Extracted from the "stored → candidates" normalization that used to be
// inlined verbatim in `anyAllowListed` and (in an entries-shaped variant)
// `filterAndProject`. Pinned here so migrating helpers to use the shared
// surface is a behaviour-preserving refactor. See helpers.js file-level
// docstring for the taxonomy that motivates the shape.
// ---------------------------------------------------------------------------

describe('isRecordMap', () => {
  it('returns true for a plain records-keyed object', () => {
    expect(isRecordMap({ line1: 'a', line2: 'b' })).toBe(true)
  })

  it('returns true for an empty object (still a records-map shape)', () => {
    // Empty-map is treated as a records-map at the shape level — callers
    // that care about "has any records" use `present` semantics on top.
    expect(isRecordMap({})).toBe(true)
  })

  it('returns false for scalar strings', () => {
    expect(isRecordMap('a')).toBe(false)
    expect(isRecordMap('')).toBe(false)
  })

  it('returns false for other scalar primitives', () => {
    expect(isRecordMap(0)).toBe(false)
    expect(isRecordMap(false)).toBe(false)
    expect(isRecordMap(true)).toBe(false)
  })

  it('returns false for undefined', () => {
    expect(isRecordMap(undefined)).toBe(false)
  })

  it('returns false for null', () => {
    // null is `typeof 'object'` in JS — the check must exclude it.
    expect(isRecordMap(null)).toBe(false)
  })

  it('returns false for arrays', () => {
    // Arrays are `typeof 'object'` but semantically not records-maps.
    // The original inline check used `!Array.isArray(stored)` — pin it.
    expect(isRecordMap([])).toBe(false)
    expect(isRecordMap(['a', 'b'])).toBe(false)
  })
})

describe('readGate', () => {
  const gateId = 'gate-id'

  it('returns { present: false, candidates: [] } when nothing is stored', () => {
    expect(readGate({}, gateId)).toEqual({ present: false, candidates: [] })
  })

  it('returns { present: false, candidates: [] } for undefined stored value', () => {
    // Explicitly-stored-as-undefined is treated the same as missing.
    expect(readGate({ [gateId]: undefined }, gateId)).toEqual({
      present: false,
      candidates: []
    })
  })

  it('wraps a scalar string in a single-element candidates array', () => {
    expect(readGate({ [gateId]: 'yes' }, gateId)).toEqual({
      present: true,
      candidates: ['yes']
    })
  })

  it('wraps other scalar primitives (0, false, empty string) as present', () => {
    // Matches the original inline `stored !== undefined ? [stored] : []`
    // — falsy-but-defined values ARE present as candidates.
    expect(readGate({ [gateId]: 0 }, gateId)).toEqual({
      present: true,
      candidates: [0]
    })
    expect(readGate({ [gateId]: false }, gateId)).toEqual({
      present: true,
      candidates: [false]
    })
    expect(readGate({ [gateId]: '' }, gateId)).toEqual({
      present: true,
      candidates: ['']
    })
  })

  it('treats null as a scalar (present with a single null candidate)', () => {
    // The original inline check was `stored && typeof stored === 'object'
    // && !Array.isArray(stored)` — null fails the truthiness gate and
    // falls to the scalar branch as `!== undefined`. Pin that.
    expect(readGate({ [gateId]: null }, gateId)).toEqual({
      present: true,
      candidates: [null]
    })
  })

  it('projects a records-map to its values as candidates', () => {
    expect(readGate({ [gateId]: { line1: 'a', line2: 'b' } }, gateId)).toEqual({
      present: true,
      candidates: ['a', 'b']
    })
  })

  it('returns present:true with empty candidates for an empty records-map', () => {
    // Empty object is a records-map shape but has no values; `some()`
    // over an empty candidates array still returns false — matches the
    // original inline behaviour for `{}` (Object.values({}) is []).
    expect(readGate({ [gateId]: {} }, gateId)).toEqual({
      present: true,
      candidates: []
    })
  })

  it('treats arrays as scalars (single-element candidates wrapping the array)', () => {
    // The original inline check falls arrays through to the scalar branch
    // because of `!Array.isArray(stored)`. Preserve that verbatim — a
    // helper caller receiving an array-shaped stored value gets ONE
    // candidate (the array itself), not the array spread.
    const stored = ['a', 'b']
    expect(readGate({ [gateId]: stored }, gateId)).toEqual({
      present: true,
      candidates: [stored]
    })
  })
})
