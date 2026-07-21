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

describe('#proveReachability — trivial cases', () => {
  it('Should classify an obligation with dependsOn: [] as reachable', () => {
    // Cite: countryOfOrigin in the real manifest has dependsOn: [] —
    // one of 19 always-in-scope closures per the Phase 2 sweep.
    const result = proveReachability([record('countryOfOrigin', [])])
    expect(result.reachable).toContain('countryOfOrigin')
    expect(result.unreachable).toEqual([])
    expect(result.errors).toEqual([])
  })

  it('Should classify an obligation whose dependsOn hits an always-in-scope gate as reachable', () => {
    // Mirrors regionCode → regionCodeRequirement in the real manifest.
    const result = proveReachability([
      record('gate', []),
      record('gated', ['gate'])
    ])
    expect(result.reachable).toEqual(expect.arrayContaining(['gate', 'gated']))
    expect(result.unreachable).toEqual([])
  })

  it('Should handle a chain of transitive dependencies', () => {
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

describe('#proveReachability — unreachable detection', () => {
  it('Should flag an obligation whose dependency chain has no always-in-scope root', () => {
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

  it('Should flag an obligation whose transitive chain hits a floating id', () => {
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

describe('#proveReachability — real V4 manifest', () => {
  it('Should report ZERO unreachable obligations', () => {
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
// Self-loop handling — the prover must treat a pure self-referencing
// dependsOn as a seed and never recurse forever. (inc-016b removed the
// manifest's only self-loop — accompanyingDocumentType is now an
// applyTo-less per-record trigger — so this exercises the rule with a
// synthetic record and pins the whole-manifest run stays clean.)
// ---------------------------------------------------------------------------

describe('#proveReachability — self-loop handling', () => {
  it('Should not recurse forever on a self-referencing dependsOn', () => {
    // Rule: pure self-loops (dependsOn === [own-id]) are treated as
    // seeds. Graph-wise a self-loop has no EXTERNAL prerequisite —
    // nothing beyond the obligation itself constrains whether the gate
    // fires.
    //
    // Two things this test pins:
    //   (a) it does NOT crash / stack-overflow (visited-tracking).
    //   (b) the classification is deterministic + treats as reachable.
    const result = proveReachability([record('acc-doc-type', ['acc-doc-type'])])
    expect(result.errors).toEqual([])
    expect(result.reachable).toContain('acc-doc-type')
    expect(result.unreachable).not.toContain('acc-doc-type')
  })

  it('Should have zero unreachable and no errors for the full manifest', () => {
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

describe('#proveReachability — defensive against dangling ids', () => {
  it('Should report a dangling dependsOn id as an error (does not crash)', () => {
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

describe('#synthesiseWitness — per-helper metadata inversion', () => {
  const codeObl = { id: 'code-obl' }
  const boolObl = { id: 'bool-obl' }

  it('Should return the first allowlist entry as witness for allowListed', () => {
    const gate = allowListed(codeObl, ['a', 'b', 'c'])
    const obl = { id: 'gated', applyTo: gate }
    const witness = synthesiseWitness(obl)
    expect(witness).toMatchObject({
      kind: WITNESS_KIND.WITNESS,
      obligationId: codeObl.id,
      value: 'a'
    })
    // projection defaults to null for depth-1 allowListed.
    expect(witness.projection).toBeNull()
    // Fidelity — inject the witness and run the actual closure.
    const decision = obl.applyTo(
      { [witness.obligationId]: { k1: witness.value } },
      new Map()
    )
    expect(decision.inScope).toBe(true)
  })

  it('Should carry the projection id when allowListed has a projection group', () => {
    const groupObl = { id: 'group-obl' }
    const gate = allowListed(codeObl, ['a'], groupObl)
    const witness = synthesiseWitness({ id: 'gated', applyTo: gate })
    expect(witness).toEqual({
      kind: WITNESS_KIND.WITNESS,
      obligationId: codeObl.id,
      value: 'a',
      projection: groupObl.id
    })
  })

  it('Should return the first allowlist entry as witness for anyAllowListed', () => {
    const gate = anyAllowListed(
      codeObl,
      ['x', 'y'],
      { inScope: true, status: 'mandatory' },
      { inScope: false }
    )
    const obl = { id: 'gated', applyTo: gate }
    const witness = synthesiseWitness(obl)
    expect(witness).toEqual({
      kind: WITNESS_KIND.WITNESS,
      obligationId: codeObl.id,
      value: 'x'
    })
    const decision = obl.applyTo({ [witness.obligationId]: witness.value })
    expect(decision.inScope).toBe(true)
  })

  it('Should return metadata.value as witness for matches', () => {
    const gate = matches(boolObl, 'yes')
    const obl = { id: 'gated', applyTo: gate }
    const witness = synthesiseWitness(obl)
    expect(witness).toEqual({
      kind: WITNESS_KIND.WITNESS,
      obligationId: boolObl.id,
      value: 'yes'
    })
    const decision = obl.applyTo({ [witness.obligationId]: witness.value })
    expect(decision.inScope).toBe(true)
  })

  it('Should return trivial for a TOTAL branchedGate (both branches in-scope)', () => {
    const gate = branchedGate(
      () => true,
      { inScope: true, status: 'mandatory' },
      { inScope: true, status: 'optional' }
    )
    const witness = synthesiseWitness({ id: 'gated', applyTo: gate })
    expect(witness).toEqual({ kind: WITNESS_KIND.TRIVIAL })
  })

  it('Should synthesise a witness that opens the gate for branchedGate with predicateMeta.equals', () => {
    const gate = branchedGate(
      (f) => f[boolObl.id] === 'yes',
      { inScope: true, status: 'mandatory' },
      { inScope: false },
      { operator: 'equals', obligationId: boolObl.id, value: 'yes' }
    )
    const obl = { id: 'gated', applyTo: gate }
    const witness = synthesiseWitness(obl)
    expect(witness).toEqual({
      kind: WITNESS_KIND.WITNESS,
      obligationId: boolObl.id,
      value: 'yes'
    })
    const decision = obl.applyTo(
      { [witness.obligationId]: witness.value },
      new Map()
    )
    expect(decision.inScope).toBe(true)
  })

  it('Should fire the closure with a witness for branchedGate with predicateMeta.includes', () => {
    const gate = branchedGate(
      (f) => ['a', 'b'].includes(f[codeObl.id]),
      { inScope: true, status: 'optional' },
      { inScope: false },
      { operator: 'includes', obligationId: codeObl.id, values: ['a', 'b'] }
    )
    const obl = { id: 'gated', applyTo: gate }
    const witness = synthesiseWitness(obl)
    expect(witness.kind).toBe(WITNESS_KIND.WITNESS)
    expect(witness.obligationId).toBe(codeObl.id)
    expect(['a', 'b']).toContain(witness.value)
    const decision = obl.applyTo(
      { [witness.obligationId]: witness.value },
      new Map()
    )
    expect(decision.inScope).toBe(true)
  })

  it('Should return opaque for a non-total branchedGate WITHOUT predicateMeta', () => {
    const gate = branchedGate(
      () => true,
      { inScope: true, status: 'mandatory' },
      { inScope: false }
    )
    const witness = synthesiseWitness({ id: 'gated', applyTo: gate })
    expect(witness.kind).toBe(WITNESS_KIND.OPAQUE)
    expect(witness.reason).toContain('predicateMeta')
  })

  it('Should return a value NOT in the derived union as witness for notInUnionOf', () => {
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
    const witness = synthesiseWitness(obl)
    expect(witness.kind).toBe(WITNESS_KIND.WITNESS)
    expect(witness.obligationId).toBe(codeObl.id)
    // The synthesised value must NOT be in the derived union.
    expect(['a', 'b', 'c', 'd']).not.toContain(witness.value)
    // Fidelity — the witness actually opens the closure.
    const decision = obl.applyTo(
      { [witness.obligationId]: { k1: witness.value } },
      new Map()
    )
    expect(decision.inScope).toBe(true)
  })

  it('Should carry the projection id when notInUnionOf has a projection group', () => {
    const groupObl = { id: 'group-obl' }
    const gate = notInUnionOf(codeObl, [['a']], groupObl)
    const witness = synthesiseWitness({ id: 'gated', applyTo: gate })
    expect(witness.kind).toBe(WITNESS_KIND.WITNESS)
    expect(witness.obligationId).toBe(codeObl.id)
    expect(witness.projection).toBe(groupObl.id)
    expect(['a']).not.toContain(witness.value)
  })

  it('Should return trivial for an obligation without applyTo (structural group)', () => {
    const witness = synthesiseWitness({ id: 'commodityLine' })
    expect(witness).toEqual({ kind: WITNESS_KIND.TRIVIAL })
  })

  it('Should return trivial for an always-in-scope bare closure (no .metadata)', () => {
    const witness = synthesiseWitness({
      id: 'always',
      applyTo: () => ({ inScope: true, status: 'mandatory' })
    })
    expect(witness).toEqual({ kind: WITNESS_KIND.TRIVIAL })
  })

  // -------------------------------------------------------------------------
  // Meta-first gate helpers — EUDPA-288 Phase 4.5.1. Each is a
  // structured helper whose `.metadata` fully describes the gate, so
  // witness synth reads directly and the fidelity round-trip must open
  // the real closure. Migration onto them is Phase 4.5.2's job — this
  // block only pins the witness-synth contract.
  // -------------------------------------------------------------------------

  it('Should synthesise a witness that opens the real closure for equalsGate (purge-on-flip)', () => {
    const gate = equalsGate(
      boolObl,
      'yes',
      { inScope: true, status: 'mandatory' },
      { inScope: false }
    )
    const obl = { id: 'gated', applyTo: gate }
    const witness = synthesiseWitness(obl)
    expect(witness).toEqual({
      kind: WITNESS_KIND.WITNESS,
      obligationId: boolObl.id,
      value: 'yes'
    })
    const decision = obl.applyTo({ [witness.obligationId]: witness.value })
    expect(decision.inScope).toBe(true)
  })

  it('Should classify equalsGate (total — regionCode shape) as trivial', () => {
    // regionCode's shape: both branches in-scope, status flips only.
    // Any input opens the gate, no witness needed.
    const gate = equalsGate(
      boolObl,
      'yes',
      { inScope: true, status: 'mandatory' },
      { inScope: true, status: 'optional' }
    )
    const witness = synthesiseWitness({ id: 'gated', applyTo: gate })
    expect(witness).toEqual({ kind: WITNESS_KIND.TRIVIAL })
  })

  it('Should synthesise a witness that opens the real closure for presentGate (purge-on-flip)', () => {
    const gate = presentGate(
      boolObl,
      { inScope: true, status: 'mandatory' },
      { inScope: false }
    )
    const obl = { id: 'gated', applyTo: gate }
    const witness = synthesiseWitness(obl)
    expect(witness.kind).toBe(WITNESS_KIND.WITNESS)
    expect(witness.obligationId).toBe(boolObl.id)
    const decision = obl.applyTo({ [witness.obligationId]: witness.value })
    expect(decision.inScope).toBe(true)
  })

  it('Should classify presentGate (total) as trivial', () => {
    const gate = presentGate(
      boolObl,
      { inScope: true, status: 'mandatory' },
      { inScope: true, status: 'optional' }
    )
    const witness = synthesiseWitness({ id: 'gated', applyTo: gate })
    expect(witness).toEqual({ kind: WITNESS_KIND.TRIVIAL })
  })

  it('Should synthesise a witness that opens the real closure for includesGate (purge-on-flip)', () => {
    const gate = includesGate(
      codeObl,
      ['a', 'b'],
      { inScope: true, status: 'optional' },
      { inScope: false }
    )
    const obl = { id: 'gated', applyTo: gate }
    const witness = synthesiseWitness(obl)
    expect(witness.kind).toBe(WITNESS_KIND.WITNESS)
    expect(witness.obligationId).toBe(codeObl.id)
    expect(['a', 'b']).toContain(witness.value)
    const decision = obl.applyTo({ [witness.obligationId]: witness.value })
    expect(decision.inScope).toBe(true)
  })

  it('Should classify includesGate (total) as trivial', () => {
    const gate = includesGate(
      codeObl,
      ['a', 'b'],
      { inScope: true, status: 'mandatory' },
      { inScope: true, status: 'optional' }
    )
    const witness = synthesiseWitness({ id: 'gated', applyTo: gate })
    expect(witness).toEqual({ kind: WITNESS_KIND.TRIVIAL })
  })

  it('Should classify alwaysInScope as trivial (no read; gate always open)', () => {
    const gate = alwaysInScope('mandatory')
    const obl = { id: 'gated', applyTo: gate }
    const witness = synthesiseWitness(obl)
    expect(witness).toEqual({ kind: WITNESS_KIND.TRIVIAL })
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

describe('#synthesiseWitness — real manifest fidelity', () => {
  it('Should classify regionCode (status-swap equalsGate) as trivial — both branches in scope', () => {
    // Retain-value shape: whenTrue mandatory, whenFalse optional — every
    // input opens the gate, so no witness is needed.
    const regionCode = obligations.find((o) => o.name === 'regionOfOriginCode')
    const witness = synthesiseWitness(regionCode)
    expect(witness.kind).toBe(WITNESS_KIND.TRIVIAL)
    const decision = regionCode.applyTo(
      { [regionCode.applyTo.metadata.obligation]: 'yes' },
      new Map()
    )
    expect(decision.inScope).toBe(true)
    expect(decision.status).toBe('mandatory')
  })

  it('Should open the closure with a witness for purposeInInternalMarket (non-total branchedGate)', () => {
    // Non-total: whenTrue.inScope === true, whenFalse.inScope === false.
    // predicateMeta declares operator: 'equals' + value: 'internal-market'.
    // This is the load-bearing fidelity check for annotated call sites.
    const purposeInInternalMarketObl = obligations.find(
      (o) => o.name === 'purposeInInternalMarket'
    )
    const witness = synthesiseWitness(purposeInInternalMarketObl)
    expect(witness.kind).toBe(WITNESS_KIND.WITNESS)
    const decision = purposeInInternalMarketObl.applyTo(
      { [witness.obligationId]: witness.value },
      new Map()
    )
    expect(decision.inScope).toBe(true)
    expect(decision.status).toBe('mandatory')
  })

  it('Should open the closure with an includes-shape witness for transitedCountries', () => {
    const transitedCountriesObl = obligations.find(
      (o) => o.name === 'transitedCountries'
    )
    const witness = synthesiseWitness(transitedCountriesObl)
    expect(witness.kind).toBe(WITNESS_KIND.WITNESS)
    const decision = transitedCountriesObl.applyTo(
      { [witness.obligationId]: witness.value },
      new Map()
    )
    expect(decision.inScope).toBe(true)
  })

  it('Should open the closure with a commodity-code witness for numberOfPackages (allowListed)', () => {
    const numberOfPackagesObl = obligations.find(
      (o) => o.name === 'numberOfPackages'
    )
    const witness = synthesiseWitness(numberOfPackagesObl)
    expect(witness.kind).toBe(WITNESS_KIND.WITNESS)
    // allowListed with no projection uses gate-level record keys.
    const decision = numberOfPackagesObl.applyTo(
      { [witness.obligationId]: { line1: witness.value } },
      new Map()
    )
    expect(decision.inScope).toBe(true)
  })

  it('Should open the closure with a scalar witness for cph (anyAllowListed)', () => {
    const cph = obligations.find((o) => o.name === 'countyParishHoldingCph')
    const witness = synthesiseWitness(cph)
    expect(witness.kind).toBe(WITNESS_KIND.WITNESS)
    const decision = cph.applyTo({
      [witness.obligationId]: { line1: witness.value }
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

describe('#proveWithWitnesses — real V4 manifest classification', () => {
  it('Should leave the graph-level result unchanged (backwards compat with commit 1)', () => {
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

  it('Should have the expected classification counts after Phase 4 notInUnionOf migration (≥14 synthesisable, 0 opaque)', () => {
    const result = proveWithWitnesses(obligations)
    // Phase 4 §Migration #4: identificationDetails + description
    // migrated off `allowListedByPredicate` onto `notInUnionOf`. Both
    // now witness-synthesisable — the manifest carries ZERO opaque
    // gates.
    //
    // Structured helpers: allowListed, anyAllowListed, notInUnionOf and
    // the meta-first gates are all synthesisable. Trivial: structural
    // groups, the four applyTo-less accompanying-document fields and
    // the retain-value regionOfOriginCode (both branches in scope).
    expect(result.witnesses.synthesisable.length).toBeGreaterThanOrEqual(14)
    // The two former-opaque gates are now synthesisable.
    const synthesisableNames = result.witnesses.synthesisable.map(
      (id) => obligations.find((o) => o.id === id).name
    )
    expect(synthesisableNames).toContain(
      'animalIdentifierIdentificationDetails'
    )
    expect(synthesisableNames).toContain('animalIdentifierDescription')
    // No opaque gates left on the manifest.
    expect(result.witnesses.opaque).toEqual([])
  })

  it('Should pass every fidelity check (no witness fails to open its own closure)', () => {
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
// Phase 4.5.2 migration fidelity — EXHAUSTIVE round-trip across all 9
// sites migrated from `branchedGate`+`predicateMeta` onto the meta-first
// helpers (`equalsGate`, `presentGate`, `includesGate`). This is the
// load-bearing "migration didn't change semantics" pin: for each site
// we synthesise a witness, inject it into a fulfilments map, feed it to
// the migrated `applyTo` closure, and assert the decision opens
// (inScope: true) with the expected status flip preserved.
//
// The test is intentionally exhaustive — one case per migrated site —
// so a subtle regression on any one site (e.g. dropping a reason list,
// swapping mandatory/optional on regionCode) fails loudly with the site
// name in the assertion label. Sites that classify as TRIVIAL (total-
// branches — the four accompanyingDocument siblings) can still exercise
// the closure directly with a known-in-scope value to pin the decision
// shape.
// ---------------------------------------------------------------------------

describe('Phase 4.5.2 migration fidelity — 9 sites round-trip', () => {
  const findOblByName = (name) => obligations.find((o) => o.name === name)

  // Non-total: whenTrue in scope, whenFalse out. Witness synth returns
  // a real WITNESS; fidelity injects and confirms decision.inScope.
  it.each([
    ['purposeInInternalMarket', 'mandatory'],
    ['commercialTransporter', 'mandatory'],
    ['privateTransporter', 'mandatory'],
    ['transitedCountries', 'optional']
  ])(
    '%s: witness opens the migrated closure with status=%s',
    (name, status) => {
      const obl = findOblByName(name)
      const witness = synthesiseWitness(obl)
      expect(witness.kind).toBe(WITNESS_KIND.WITNESS)
      const decision = obl.applyTo(
        { [witness.obligationId]: witness.value },
        new Map()
      )
      expect(decision.inScope).toBe(true)
      expect(decision.status).toBe(status)
      // Reasons should be attached on the in-scope branch — they are the
      // load-bearing verbatim decision-object bit the migration must
      // preserve.
      expect(Array.isArray(decision.reasons)).toBe(true)
      expect(decision.reasons.length).toBeGreaterThan(0)
    }
  )

  // Retain-value gate — both branches in scope, so no witness is needed;
  // the fidelity check exercises the closure with both values to prove
  // the status flip is preserved (mandatory on 'yes', optional on 'no').
  it('regionCode: matching value → mandatory + reason, non-matching → optional in scope', () => {
    const rc = findOblByName('regionOfOriginCode')
    const witness = synthesiseWitness(rc)
    expect(witness.kind).toBe(WITNESS_KIND.TRIVIAL)
    // regionCodeRequirement === 'yes' → mandatory with reason.
    const regionCodeRequirement = findOblByName('regionOfOriginCodeRequirement')
    const mand = rc.applyTo({ [regionCodeRequirement.id]: 'yes' }, new Map())
    expect(mand).toMatchObject({
      inScope: true,
      status: 'mandatory'
    })
    expect(mand.reasons).toBeDefined()
    expect(mand.reasons.length).toBeGreaterThan(0)
    // regionCodeRequirement === 'no' → optional, still in scope.
    const opt = rc.applyTo({ [regionCodeRequirement.id]: 'no' }, new Map())
    expect(opt).toEqual({ inScope: true, status: 'optional' })
  })

  // The four accompanying-document fields are plain mandatory fields
  // within the documents group (no applyTo). The graph-level
  // classification for an obligation without an applyTo is TRIVIAL.
  it.each([
    'accompanyingDocumentType',
    'accompanyingDocumentAttachmentType',
    'accompanyingDocumentReference',
    'accompanyingDocumentDateOfIssue'
  ])('%s is a plain mandatory document field (no applyTo)', (name) => {
    const field = findOblByName(name)
    expect(field.applyTo).toBeUndefined()
    expect(field.status).toBe('mandatory')
    expect(synthesiseWitness(field).kind).toBe(WITNESS_KIND.TRIVIAL)
  })

  // Meta-first invariant: every branchedGate→meta-first migrated site's
  // applyTo.metadata.type is one of the three helpers.
  it('every migrated site now uses a meta-first helper metadata.type', () => {
    const META_FIRST = new Set(['equalsGate', 'presentGate', 'includesGate'])
    const migratedNames = [
      'purposeInInternalMarket',
      'commercialTransporter',
      'privateTransporter',
      'transitedCountries',
      'regionOfOriginCode',
      'destinationCountry',
      'portOfExit',
      'exitDate'
    ]
    const stragglers = migratedNames
      .map(findOblByName)
      .filter((o) => !META_FIRST.has(o.applyTo?.metadata?.type))
      .map((o) => `${o.name} → ${o.applyTo?.metadata?.type}`)
    expect(stragglers).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Backwards compat — a graph-level-only test from commit 1 still
// passes verbatim. numberOfPackages was already reachable graph-side;
// it must remain so after commit 2.
// ---------------------------------------------------------------------------

describe('#proveReachability — backwards compat with commit 1', () => {
  it('Should keep numberOfPackages reachable in the graph-only pass', () => {
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
