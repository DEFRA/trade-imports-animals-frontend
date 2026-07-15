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
import { proveReachability } from './reachability.js'
import { obligations } from '../obligations/obligations.js'
import { obligationMetadata } from '../obligations/helpers.js'

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
