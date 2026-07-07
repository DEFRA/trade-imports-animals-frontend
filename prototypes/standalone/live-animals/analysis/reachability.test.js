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

describe('reachability / dead-end prover', () => {
  // proveReachability -> simulateJourney -> makeScope eagerly computes
  // readyForQuote, so inject the roll-up at boot alongside buildDispatch.
  beforeAll(() => {
    buildDispatch(dispatchPages)
    configureReadyForQuote(readyForQuote)
  })

  it('Should enumerate a small finite scope space', () => {
    // regionOfOriginCodeRequirement(2) x hadClaims(2) x voluntaryExcess(2)
    // x coverType(2) x addons-subsets(8)
    expect(enumerateScopeStates()).toHaveLength(128)
  })

  it('Should prove no owed obligation is ever unreachable', () => {
    expect(proveReachability()).toEqual([])
  })

  it('Should have teeth — reporting a dead end if an owning page becomes unreachable', () => {
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

  it('Should witness windscreenProvider at both depths (the closed hole)', () => {
    const targets = buildWitnesses().map((witness) => witness.targetKey)
    expect(targets).toContain('claims[0].windscreenProvider')
    expect(targets).toContain('drivers[0].claims[0].windscreenProvider')
  })

  it('Should actually put the item-conditional obligations in scope (not a null witness)', () => {
    const byKey = new Map(
      buildWitnesses().map((witness) => [witness.targetKey, witness])
    )
    for (const key of [
      'claims[0].windscreenProvider',
      'drivers[0].claims[0].windscreenProvider'
    ]) {
      expect(byKey.get(key)?.answers).not.toBeNull()
    }
  })

  it('Should have teeth at depth — biting when the claims/drivers hub pages are dropped', () => {
    // Drop only the two collection-hub pages — windscreenProvider lives at
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
    const windscreen = problems.find(
      (problem) =>
        problem.targetKey === 'drivers[0].claims[0].windscreenProvider'
    )
    expect(windscreen.pageId).toBe('drivers')
  })
})
