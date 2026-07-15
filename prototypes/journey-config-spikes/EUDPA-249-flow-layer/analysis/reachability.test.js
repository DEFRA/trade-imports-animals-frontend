/**
 * reachability.test.js — Phase 3 commit 1 of the EUDPA-288 blend plan.
 *
 * Port of A's reachability prover scaffold, narrowed to the graph-level
 * check A's prover collapses to when a gate's predicate is opaque:
 *
 *   "an obligation is reachable IFF every id it declares in
 *    `dependsOn` is reachable, seeded from the always-in-scope set
 *    (obligations with `dependsOn: []`)."
 *
 * Witness synthesis at the value level ("what value of `regionCode-
 * Requirement` opens `regionCode`?") is deferred to Phase 3 commit 2
 * (structured helpers) + commit 3 (coverage gate). See BRIEF
 * §Migration #3, REPORT §5.1 and DESIGN-DELTA.md.
 *
 * These tests pin behaviour that must survive commits 2 and 3:
 *   - always-in-scope obligation trivially reachable
 *   - transitive dependency chain reachable
 *   - unreachable-in-principle obligation is flagged (via a synthetic
 *     manifest — the real manifest currently has zero)
 *   - the real manifest has ZERO unreachable obligations
 *   - self-loop on accompanyingDocumentType does NOT crash
 *   - dangling id reference is reported as an error, not a crash
 */

import { describe, it, expect } from 'vitest'
import {
  proveReachability,
  proveWithWitnesses,
  synthesiseWitness,
  WITNESS_KIND
} from './reachability.js'
import { obligations } from '../obligations/obligations.js'
import {
  obligationMetadata,
  allowListed,
  alwaysInScope,
  anyAllowListed,
  branchedGate,
  equalsGate,
  includesGate,
  matches,
  notInUnionOf,
  presentGate
} from '../obligations/helpers.js'

// ---------------------------------------------------------------------------
// Helpers — turn an obligation into the `{ id, dependsOn }` record the
// prover operates over. Mirrors how the real manifest gets fed in
// (via obligationMetadata from Phase 2 commit 1).
// ---------------------------------------------------------------------------

const record = (id, dependsOn) => ({ id, dependsOn })

// A record's dependsOn is:
//   - the metadata dependsOn when the obligation has an applyTo (Phase 2
//     coverage assertion pins this to a string[]).
//   - `[]` for obligations WITHOUT an applyTo — plain field records like
//     `commodityCode`, `commodityType`, `species`, `numberOfAnimals` and
//     structural groups (`commodityLine`, `unitRecord`) are always in
//     scope at the graph level; other gated obligations legitimately
//     depend on their ids, so they must appear as seed nodes.
const manifestRecords = () =>
  obligations.map((o) => {
    if (typeof o.applyTo === 'function') {
      return { id: o.id, dependsOn: obligationMetadata(o).dependsOn }
    }
    return { id: o.id, dependsOn: [] }
  })

// ---------------------------------------------------------------------------
// Trivial reachability — the base case A's prover handles vacuously.
// ---------------------------------------------------------------------------

describe('proveReachability — trivial cases', () => {
  it('classifies an obligation with dependsOn: [] as reachable', () => {
    // Cite: countryOfOrigin in the real manifest has dependsOn: [] —
    // one of 19 always-in-scope closures per the Phase 2 sweep.
    const result = proveReachability([record('countryOfOrigin', [])])
    expect(result.reachable).toContain('countryOfOrigin')
    expect(result.unreachable).toEqual([])
    expect(result.errors).toEqual([])
  })

  it('classifies an obligation whose dependsOn hits an always-in-scope gate as reachable', () => {
    // Mirrors regionCode → regionCodeRequirement in the real manifest.
    const result = proveReachability([
      record('gate', []),
      record('gated', ['gate'])
    ])
    expect(result.reachable).toEqual(expect.arrayContaining(['gate', 'gated']))
    expect(result.unreachable).toEqual([])
  })

  it('handles a chain of transitive dependencies', () => {
    // A → B → C where A is always in scope.
    const result = proveReachability([
      record('A', []),
      record('B', ['A']),
      record('C', ['B'])
    ])
    expect(result.reachable).toEqual(expect.arrayContaining(['A', 'B', 'C']))
    expect(result.unreachable).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Genuinely unreachable — the defect the prover is meant to catch.
// ---------------------------------------------------------------------------

describe('proveReachability — unreachable detection', () => {
  it('flags an obligation whose dependency chain has no always-in-scope root', () => {
    // Construct a synthetic pocket with no dependsOn: [] seeds — the
    // two nodes mutually depend on each other with no external entry.
    // Neither can be reached from any seed (there are no seeds).
    const result = proveReachability([
      record('gate', ['gated']),
      record('gated', ['gate'])
    ])
    expect(result.reachable).toEqual([])
    expect(result.unreachable).toEqual(
      expect.arrayContaining(['gate', 'gated'])
    )
  })

  it('flags an obligation whose transitive chain hits a floating id', () => {
    // A depends on something that's not itself always-in-scope: if the
    // pre-requisite is not reachable, neither is A.
    const result = proveReachability([
      record('root-unreachable', ['nowhere']),
      record('downstream', ['root-unreachable']),
      // But 'nowhere' is not in the manifest — that's an error, not a
      // reachability answer. See separate test below for the error path.
      // Here we add a proper always-in-scope seed so it's obvious the
      // unreachable/error signals are separable.
      record('seed', [])
    ])
    expect(result.reachable).toContain('seed')
    expect(result.errors.map((e) => e.obligationId)).toContain(
      'root-unreachable'
    )
  })
})

// ---------------------------------------------------------------------------
// The real manifest — this is the prover's "green" state today.
// ---------------------------------------------------------------------------

describe('proveReachability — real V4 manifest', () => {
  it('reports ZERO unreachable obligations', () => {
    // Phase 2 commit 2 landed dependsOn on every gated obligation.
    // Under the conservative closure treatment (a closure "opens" iff
    // every dependsOn is reachable), no cycle-free set of closures on
    // the real manifest can trap a gate that's never opened. Any
    // regression here means someone shipped a real reachability
    // defect — this test is the guard.
    const result = proveReachability(manifestRecords())
    expect(result.unreachable).toEqual([])
    // Errors would indicate a dangling id — also a genuine defect.
    expect(result.errors).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Self-loop — accompanyingDocumentType's gate reads its own stored
// value. Phase 2's sweep pinned this via a raw-literal dependsOn.
// The prover must not go into infinite recursion.
// ---------------------------------------------------------------------------

describe('proveReachability — self-loop handling', () => {
  it('does not recurse forever on a self-referencing dependsOn', () => {
    // The manifest has one legitimate self-loop: accompanyingDocument-
    // Type's gate closure literally reads fulfilments[its-own-id]
    // (branchedGate on isFilled(fulfilments[accompanyingDocumentType.id])).
    //
    // Rule: pure self-loops (dependsOn === [own-id]) are treated as
    // seeds. Graph-wise a self-loop has no EXTERNAL prerequisite —
    // nothing beyond the obligation itself constrains whether the gate
    // fires. Whether the closure body is total-over-branches is a
    // value-level question deferred to commit 2's witness synthesiser
    // for structured helpers; at the graph level, "reads only my own
    // value" is equivalent to "reads nothing".
    //
    // Two things this test pins:
    //   (a) it does NOT crash / stack-overflow (visited-tracking).
    //   (b) the classification is deterministic + treats as reachable.
    const result = proveReachability([record('acc-doc-type', ['acc-doc-type'])])
    expect(result.errors).toEqual([])
    expect(result.reachable).toContain('acc-doc-type')
    expect(result.unreachable).not.toContain('acc-doc-type')
  })

  it('does not crash on accompanyingDocumentType in the full manifest', () => {
    // Regression pin — the real manifest contains this self-loop plus
    // three siblings that reference it. The whole-manifest run above
    // asserted zero unreachable; here we specifically confirm the
    // prover completes when the self-loop is part of the input.
    const result = proveReachability(manifestRecords())
    expect(result).toBeDefined()
    expect(result.errors).toEqual([])
    expect(result.unreachable).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Defensive — a dangling id should never happen post-Phase-2, but
// the prover must not crash if it does.
// ---------------------------------------------------------------------------

describe('proveReachability — defensive against dangling ids', () => {
  it('reports a dangling dependsOn id as an error (does not crash)', () => {
    const result = proveReachability([
      record('seed', []),
      record('dangler', ['id-that-does-not-exist'])
    ])
    // The dangler is flagged as an error.
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toMatchObject({
      obligationId: 'dangler',
      reason: expect.stringContaining('unknown')
    })
    // The seed is still classified normally.
    expect(result.reachable).toContain('seed')
  })
})

// ---------------------------------------------------------------------------
// Phase 3 commit 2 — witness synthesis. The `synthesiseWitness` accessor
// tightens the graph-only pass into a value-level check for structured
// helpers. BRIEF §Migration #3 + REPORT §5.1 tax warning: "witness
// synthesiser + seeding rule per operator". Each helper this test
// covers must round-trip through the REAL applyTo closure and return
// `inScope: true` — that's the fidelity assertion.
// ---------------------------------------------------------------------------

describe('synthesiseWitness — per-helper metadata inversion', () => {
  const codeObl = { id: 'code-obl' }
  const boolObl = { id: 'bool-obl' }

  it('allowListed → returns first allowlist entry as witness', () => {
    const gate = allowListed(codeObl, ['a', 'b', 'c'])
    const obl = { id: 'gated', applyTo: gate }
    const w = synthesiseWitness(obl)
    expect(w).toMatchObject({
      kind: WITNESS_KIND.WITNESS,
      obligationId: codeObl.id,
      value: 'a'
    })
    // projection defaults to null for depth-1 allowListed.
    expect(w.projection).toBeNull()
    // Fidelity — inject the witness and run the actual closure.
    const decision = obl.applyTo(
      { [w.obligationId]: { k1: w.value } },
      new Map()
    )
    expect(decision.inScope).toBe(true)
  })

  it('allowListed with projection group → witness carries projection id', () => {
    const groupObl = { id: 'group-obl' }
    const gate = allowListed(codeObl, ['a'], groupObl)
    const w = synthesiseWitness({ id: 'gated', applyTo: gate })
    expect(w).toEqual({
      kind: WITNESS_KIND.WITNESS,
      obligationId: codeObl.id,
      value: 'a',
      projection: groupObl.id
    })
  })

  it('anyAllowListed → returns first allowlist entry as witness', () => {
    const gate = anyAllowListed(
      codeObl,
      ['x', 'y'],
      { inScope: true, status: 'mandatory' },
      { inScope: false }
    )
    const obl = { id: 'gated', applyTo: gate }
    const w = synthesiseWitness(obl)
    expect(w).toEqual({
      kind: WITNESS_KIND.WITNESS,
      obligationId: codeObl.id,
      value: 'x'
    })
    const decision = obl.applyTo({ [w.obligationId]: w.value })
    expect(decision.inScope).toBe(true)
  })

  it('matches → returns metadata.value as witness', () => {
    const gate = matches(boolObl, 'yes')
    const obl = { id: 'gated', applyTo: gate }
    const w = synthesiseWitness(obl)
    expect(w).toEqual({
      kind: WITNESS_KIND.WITNESS,
      obligationId: boolObl.id,
      value: 'yes'
    })
    const decision = obl.applyTo({ [w.obligationId]: w.value })
    expect(decision.inScope).toBe(true)
  })

  it('branchedGate (TOTAL) → returns trivial (both branches in-scope)', () => {
    const gate = branchedGate(
      () => true,
      { inScope: true, status: 'mandatory' },
      { inScope: true, status: 'optional' }
    )
    const w = synthesiseWitness({ id: 'gated', applyTo: gate })
    expect(w).toEqual({ kind: WITNESS_KIND.TRIVIAL })
  })

  it('branchedGate with predicateMeta.equals → synthesises witness that opens the gate', () => {
    const gate = branchedGate(
      (f) => f[boolObl.id] === 'yes',
      { inScope: true, status: 'mandatory' },
      { inScope: false },
      { operator: 'equals', obligationId: boolObl.id, value: 'yes' }
    )
    const obl = { id: 'gated', applyTo: gate }
    const w = synthesiseWitness(obl)
    expect(w).toEqual({
      kind: WITNESS_KIND.WITNESS,
      obligationId: boolObl.id,
      value: 'yes'
    })
    const decision = obl.applyTo({ [w.obligationId]: w.value }, new Map())
    expect(decision.inScope).toBe(true)
  })

  it('branchedGate with predicateMeta.includes → witness fires the closure', () => {
    const gate = branchedGate(
      (f) => ['a', 'b'].includes(f[codeObl.id]),
      { inScope: true, status: 'optional' },
      { inScope: false },
      { operator: 'includes', obligationId: codeObl.id, values: ['a', 'b'] }
    )
    const obl = { id: 'gated', applyTo: gate }
    const w = synthesiseWitness(obl)
    expect(w.kind).toBe(WITNESS_KIND.WITNESS)
    expect(w.obligationId).toBe(codeObl.id)
    expect(['a', 'b']).toContain(w.value)
    const decision = obl.applyTo({ [w.obligationId]: w.value }, new Map())
    expect(decision.inScope).toBe(true)
  })

  it('branchedGate WITHOUT predicateMeta (non-total) → opaque', () => {
    const gate = branchedGate(
      () => true,
      { inScope: true, status: 'mandatory' },
      { inScope: false }
    )
    const w = synthesiseWitness({ id: 'gated', applyTo: gate })
    expect(w.kind).toBe(WITNESS_KIND.OPAQUE)
    expect(w.reason).toContain('predicateMeta')
  })

  it('notInUnionOf → returns a value NOT in the derived union as witness', () => {
    // Phase 4 §Migration #4: `notInUnionOf` closes the last opaque gap.
    // Witness = a stable sentinel that's NOT in the derived union. The
    // fidelity check re-runs the closure against the witness and must
    // return `inScope: true` — that's the load-bearing invariant that
    // catches metadata drift.
    const gate = notInUnionOf(codeObl, [
      ['a', 'b'],
      ['c', 'd']
    ])
    const obl = { id: 'gated', applyTo: gate }
    const w = synthesiseWitness(obl)
    expect(w.kind).toBe(WITNESS_KIND.WITNESS)
    expect(w.obligationId).toBe(codeObl.id)
    // The synthesised value must NOT be in the derived union.
    expect(['a', 'b', 'c', 'd']).not.toContain(w.value)
    // Fidelity — the witness actually opens the closure.
    const decision = obl.applyTo(
      { [w.obligationId]: { k1: w.value } },
      new Map()
    )
    expect(decision.inScope).toBe(true)
  })

  it('notInUnionOf with projection group → witness carries projection id', () => {
    const groupObl = { id: 'group-obl' }
    const gate = notInUnionOf(codeObl, [['a']], groupObl)
    const w = synthesiseWitness({ id: 'gated', applyTo: gate })
    expect(w.kind).toBe(WITNESS_KIND.WITNESS)
    expect(w.obligationId).toBe(codeObl.id)
    expect(w.projection).toBe(groupObl.id)
    expect(['a']).not.toContain(w.value)
  })

  it('obligation without applyTo → trivial (structural group)', () => {
    const w = synthesiseWitness({ id: 'commodityLine' })
    expect(w).toEqual({ kind: WITNESS_KIND.TRIVIAL })
  })

  it('always-in-scope bare closure (no .metadata) → trivial', () => {
    const w = synthesiseWitness({
      id: 'always',
      applyTo: () => ({ inScope: true, status: 'mandatory' })
    })
    expect(w).toEqual({ kind: WITNESS_KIND.TRIVIAL })
  })

  // -------------------------------------------------------------------------
  // Meta-first gate helpers — EUDPA-288 Phase 4.5.1. Each is a
  // structured helper whose `.metadata` fully describes the gate, so
  // witness synth reads directly and the fidelity round-trip must open
  // the real closure. Migration onto them is Phase 4.5.2's job — this
  // block only pins the witness-synth contract.
  // -------------------------------------------------------------------------

  it('equalsGate (purge-on-flip) → synthesises witness that opens the real closure', () => {
    const gate = equalsGate(
      boolObl,
      'yes',
      { inScope: true, status: 'mandatory' },
      { inScope: false }
    )
    const obl = { id: 'gated', applyTo: gate }
    const w = synthesiseWitness(obl)
    expect(w).toEqual({
      kind: WITNESS_KIND.WITNESS,
      obligationId: boolObl.id,
      value: 'yes'
    })
    const decision = obl.applyTo({ [w.obligationId]: w.value })
    expect(decision.inScope).toBe(true)
  })

  it('equalsGate (total — regionCode shape) → classified as trivial', () => {
    // regionCode's shape: both branches in-scope, status flips only.
    // Any input opens the gate, no witness needed.
    const gate = equalsGate(
      boolObl,
      'yes',
      { inScope: true, status: 'mandatory' },
      { inScope: true, status: 'optional' }
    )
    const w = synthesiseWitness({ id: 'gated', applyTo: gate })
    expect(w).toEqual({ kind: WITNESS_KIND.TRIVIAL })
  })

  it('presentGate (purge-on-flip) → synthesises witness that opens the real closure', () => {
    const gate = presentGate(
      boolObl,
      { inScope: true, status: 'mandatory' },
      { inScope: false }
    )
    const obl = { id: 'gated', applyTo: gate }
    const w = synthesiseWitness(obl)
    expect(w.kind).toBe(WITNESS_KIND.WITNESS)
    expect(w.obligationId).toBe(boolObl.id)
    const decision = obl.applyTo({ [w.obligationId]: w.value })
    expect(decision.inScope).toBe(true)
  })

  it('presentGate (total) → classified as trivial', () => {
    const gate = presentGate(
      boolObl,
      { inScope: true, status: 'mandatory' },
      { inScope: true, status: 'optional' }
    )
    const w = synthesiseWitness({ id: 'gated', applyTo: gate })
    expect(w).toEqual({ kind: WITNESS_KIND.TRIVIAL })
  })

  it('includesGate (purge-on-flip) → synthesises witness that opens the real closure', () => {
    const gate = includesGate(
      codeObl,
      ['a', 'b'],
      { inScope: true, status: 'optional' },
      { inScope: false }
    )
    const obl = { id: 'gated', applyTo: gate }
    const w = synthesiseWitness(obl)
    expect(w.kind).toBe(WITNESS_KIND.WITNESS)
    expect(w.obligationId).toBe(codeObl.id)
    expect(['a', 'b']).toContain(w.value)
    const decision = obl.applyTo({ [w.obligationId]: w.value })
    expect(decision.inScope).toBe(true)
  })

  it('includesGate (total) → classified as trivial', () => {
    const gate = includesGate(
      codeObl,
      ['a', 'b'],
      { inScope: true, status: 'mandatory' },
      { inScope: true, status: 'optional' }
    )
    const w = synthesiseWitness({ id: 'gated', applyTo: gate })
    expect(w).toEqual({ kind: WITNESS_KIND.TRIVIAL })
  })

  it('alwaysInScope → trivial (no read; gate always open)', () => {
    const gate = alwaysInScope('mandatory')
    const obl = { id: 'gated', applyTo: gate }
    const w = synthesiseWitness(obl)
    expect(w).toEqual({ kind: WITNESS_KIND.TRIVIAL })
    // Fidelity — the closure still returns the expected decision.
    expect(obl.applyTo({})).toEqual({ inScope: true, status: 'mandatory' })
  })
})

// ---------------------------------------------------------------------------
// Real-manifest fidelity — pick a non-total branchedGate we newly
// annotated and confirm the synthesised witness runs through the real
// applyTo closure. This is the load-bearing "witness accuracy" check:
// metadata drift vs. the real predicate would be caught here.
// ---------------------------------------------------------------------------

describe('synthesiseWitness — real manifest fidelity', () => {
  it('regionCode: total-over-branches → classified as trivial', () => {
    // regionCode's branchedGate has whenTrue.inScope === true AND
    // whenFalse.inScope === true (retain-value pattern — mandatory
    // when the requirement flag is 'yes', optional otherwise). The
    // gate opens on ANY input, so no witness is needed; commit 3's
    // coverage assertion counts these as "trivial", not opaque.
    const regionCode = obligations.find((o) => o.name === 'regionCode')
    const w = synthesiseWitness(regionCode)
    expect(w.kind).toBe(WITNESS_KIND.TRIVIAL)
  })

  it('purposeInInternalMarket (non-total branchedGate): witness opens the closure', () => {
    // Non-total: whenTrue.inScope === true, whenFalse.inScope === false.
    // predicateMeta declares operator: 'equals' + value: 'internal-market'.
    // This is the load-bearing fidelity check for annotated call sites.
    const pim = obligations.find((o) => o.name === 'purposeInInternalMarket')
    const w = synthesiseWitness(pim)
    expect(w.kind).toBe(WITNESS_KIND.WITNESS)
    const decision = pim.applyTo({ [w.obligationId]: w.value }, new Map())
    expect(decision.inScope).toBe(true)
    expect(decision.status).toBe('mandatory')
  })

  it('transitedCountries: includes-shape witness opens the closure', () => {
    const tc = obligations.find((o) => o.name === 'transitedCountries')
    const w = synthesiseWitness(tc)
    expect(w.kind).toBe(WITNESS_KIND.WITNESS)
    const decision = tc.applyTo({ [w.obligationId]: w.value }, new Map())
    expect(decision.inScope).toBe(true)
  })

  it('numberOfPackages (allowListed): commodity-code witness opens the closure', () => {
    const nop = obligations.find((o) => o.name === 'numberOfPackages')
    const w = synthesiseWitness(nop)
    expect(w.kind).toBe(WITNESS_KIND.WITNESS)
    // allowListed with no projection uses gate-level record keys.
    const decision = nop.applyTo(
      { [w.obligationId]: { line1: w.value } },
      new Map()
    )
    expect(decision.inScope).toBe(true)
  })

  it('cph (anyAllowListed): scalar witness opens the closure', () => {
    const cph = obligations.find((o) => o.name === 'cph')
    const w = synthesiseWitness(cph)
    expect(w.kind).toBe(WITNESS_KIND.WITNESS)
    const decision = cph.applyTo({
      [w.obligationId]: { line1: w.value }
    })
    expect(decision.inScope).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// proveWithWitnesses — end-to-end tightened prover over the real
// manifest. Classification counts are pinned so a regression in
// helper metadata (e.g. someone drops predicateMeta from a branched-
// Gate site) fails loudly.
// ---------------------------------------------------------------------------

describe('proveWithWitnesses — real V4 manifest classification', () => {
  it('graph-level result is unchanged (backwards compat with commit 1)', () => {
    const result = proveWithWitnesses(obligations)
    expect(result.unreachable).toEqual([])
    // Fidelity errors — none expected on the real manifest. Any error
    // here means a witness didn't open its closure, i.e. metadata
    // drift.
    expect(result.errors).toEqual([])
    // Sanity — every non-structural obligation appears somewhere.
    const classifiedCount =
      result.witnesses.synthesisable.length +
      result.witnesses.trivial.length +
      result.witnesses.opaque.length
    expect(classifiedCount).toBe(obligations.length)
  })

  it('classification counts after Phase 4 notInUnionOf migration (≥14 synthesisable, 0 opaque)', () => {
    const result = proveWithWitnesses(obligations)
    // Phase 4 §Migration #4: identificationDetails + description
    // migrated off `allowListedByPredicate` onto `notInUnionOf`. Both
    // now witness-synthesisable — the manifest carries ZERO opaque
    // gates.
    //
    // Structured helpers per hand-off: allowListed × 6 + anyAllowListed
    // × 2 + branchedGate-with-predicateMeta × 5 + notInUnionOf × 2 = 15
    // synthesisable. Trivial: regionCode + four accompanyingDocument
    // siblings.
    expect(result.witnesses.synthesisable.length).toBeGreaterThanOrEqual(14)
    // The two former-opaque gates are now synthesisable.
    const synthesisableNames = result.witnesses.synthesisable.map(
      (id) => obligations.find((o) => o.id === id).name
    )
    expect(synthesisableNames).toContain('identificationDetails')
    expect(synthesisableNames).toContain('description')
    // No opaque gates left on the manifest.
    expect(result.witnesses.opaque).toEqual([])
  })

  it('every fidelity check passes (no witness fails to open its own closure)', () => {
    // Guarding against silent metadata drift: if someone changes a
    // branchedGate's predicate body without updating predicateMeta,
    // this fires.
    const result = proveWithWitnesses(obligations)
    expect(result.errors.filter((e) => /did not open/.test(e.reason))).toEqual(
      []
    )
  })
})

// ---------------------------------------------------------------------------
// Backwards compat — a graph-level-only test from commit 1 still
// passes verbatim. numberOfPackages was already reachable graph-side;
// it must remain so after commit 2.
// ---------------------------------------------------------------------------

describe('proveReachability — backwards compat with commit 1', () => {
  it('numberOfPackages is still reachable in the graph-only pass', () => {
    // The commit-1 whole-manifest test asserts zero unreachable. This
    // pin picks out a specific gate to prove the graph-level behaviour
    // is UNCHANGED — commit 2 tightens on top of commit 1, it does
    // not replace it.
    const records = obligations.map((o) => {
      if (typeof o.applyTo === 'function') {
        return { id: o.id, dependsOn: obligationMetadata(o).dependsOn }
      }
      return { id: o.id, dependsOn: [] }
    })
    const result = proveReachability(records)
    const nop = obligations.find((o) => o.name === 'numberOfPackages')
    expect(result.reachable).toContain(nop.id)
  })
})
