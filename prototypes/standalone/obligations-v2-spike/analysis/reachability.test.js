import { beforeAll, describe, expect, it } from 'vitest'

import { buildDispatch } from '../flow/dispatch.js'
import { readyForQuote } from '../flow/section-status.js'
import { configureReadyForQuote } from '../engine/read.js'
import { dispatchPages } from '../features/index.js'
import {
  buildWitnesses,
  enumerateScopeStates,
  proveReachability
} from './reachability.js'
import { simulateJourney } from './simulate.js'

/** The model-level dead-end prover (entry 4), extended to full depth (NW-5). */
describe('reachability / dead-end prover', () => {
  // proveReachability -> simulateJourney -> makeScope eagerly computes
  // readyForQuote, so inject the roll-up at boot alongside buildDispatch.
  beforeAll(() => {
    buildDispatch(dispatchPages)
    configureReadyForQuote(readyForQuote)
  })

  it('enumerates a small finite scope space', () => {
    // hadClaims(2) x voluntaryExcess(2) x coverType(2) x addons-subsets(8)
    expect(enumerateScopeStates()).toHaveLength(64)
  })

  it('proves no owed obligation is ever unreachable', () => {
    expect(proveReachability()).toEqual([])
  })

  it('has teeth — reports a dead end if an owning page becomes unreachable', () => {
    // Inject a reachability oracle that pretends the named-driver pages never open.
    const pagesFor = () => [
      'email',
      'about-you',
      'driving-history',
      'cover-type'
    ]
    const problems = proveReachability({ pagesFor })
    expect(problems.length).toBeGreaterThan(0)
    expect(problems.map((problem) => problem.obligation)).toContain('drivers')
    expect(
      problems.every(
        (problem) => problem.reason === 'owning-page-unreachable-in-scope'
      )
    ).toBe(true)
  })

  // --- NW-5: the depth extension closes the ROOTS-ONLY hole ------------------
  // Before NW-5 the prover iterated `registry.all` (roots) and keyed scope by
  // bare id, so no sub-obligation was ever checked. The clearest casualty was
  // the item-conditional `windscreenProvider`, owed only when a claim's own
  // `claimType === 'windscreen'` — a state no top-level enumeration produces.
  // These tests pin that the plan now WITNESSES it at both depths and that the
  // prover BITES when a collection-hub page is dropped at depth.

  it('witnesses windscreenProvider at BOTH depths (the closed hole)', () => {
    const targets = buildWitnesses().map((witness) => witness.targetKey)
    // Top-level claims loop and the driver-nested claims loop.
    expect(targets).toContain('claims[0].windscreenProvider')
    expect(targets).toContain('drivers[0].claims[0].windscreenProvider')
  })

  it('actually puts the item-conditional obligations in scope (not a null witness)', () => {
    const byKey = new Map(
      buildWitnesses().map((witness) => [witness.targetKey, witness])
    )
    for (const key of [
      'claims[0].windscreenProvider',
      'drivers[0].claims[0].windscreenProvider'
    ]) {
      // A found witness (non-null answers) means reconcile confirmed the target
      // instance path is in scope — proven, not asserted in prose.
      expect(byKey.get(key)?.answers).not.toBeNull()
    }
  })

  it('has teeth AT DEPTH — biting when the claims/drivers hub pages are dropped', () => {
    // Drop only the two collection-hub pages; everything else stays reachable.
    // A roots-only prover could not surface this — windscreenProvider lives at
    // depth and its DERIVED owning page is the dropped hub.
    const pagesFor = (answers) =>
      simulateJourney(answers).filter(
        (pageId) => pageId !== 'claims' && pageId !== 'drivers'
      )
    const problems = proveReachability({ pagesFor })
    const deadEnds = problems
      .filter(
        (problem) => problem.reason === 'owning-page-unreachable-in-scope'
      )
      .map((problem) => problem.targetKey)
    expect(deadEnds).toContain('claims[0].windscreenProvider')
    expect(deadEnds).toContain('drivers[0].claims[0].windscreenProvider')
    // And the derived owning page named is the dropped hub, at depth.
    const windscreen = problems.find(
      (problem) =>
        problem.targetKey === 'drivers[0].claims[0].windscreenProvider'
    )
    expect(windscreen.pageId).toBe('drivers')
  })
})
