import { beforeAll, describe, expect, it } from 'vitest'

import { buildDispatch, pageOfObligation } from '../flow/dispatch.js'
import { readyForCheckYourAnswers } from '../flow/section-status.js'
import { configureReadyForCheckYourAnswers } from '../engine/read.js'
import { dispatchPages } from '../features/index.js'
import { makeScope } from '../engine/index.js'
import { SYSTEM_POPULATED } from '../flow/obligation-source.js'
import { simulateJourney } from './simulate.js'
import {
  enumerateScopeStates,
  proveFlowReachability,
  submitReadySeed
} from './flow-reachability.js'

// Ported from A's retired analysis/reachability.test.js — the two FLOW-level
// checks A's prover carried over B's graph prover: every in-scope obligation
// has an owning page (`no-owning-page`) and that page is reachable through the
// flow gates in the state that scopes it (`owning-page-unreachable-in-scope`).

describe('flow reachability / dead-end prover (B)', () => {
  beforeAll(() => {
    buildDispatch(dispatchPages)
    configureReadyForCheckYourAnswers(readyForCheckYourAnswers)
  })

  it('Should enumerate a small finite scope space', () => {
    expect(enumerateScopeStates()).toHaveLength(24)
  })

  it('Should prove no in-scope obligation is ever page-unreachable', () => {
    expect(proveFlowReachability()).toEqual([])
  })

  it('Should have teeth — reporting dead ends when pages go unreachable', () => {
    // Only origin + commodities survive; every in-scope obligation owned by
    // any other page becomes an owning-page-unreachable-in-scope dead end.
    const pagesFor = () => ['origin', 'commodities']
    const problems = proveFlowReachability({ pagesFor })
    expect(problems.length).toBeGreaterThan(0)
    expect(
      problems.every(
        (problem) => problem.reason === 'owning-page-unreachable-in-scope'
      )
    ).toBe(true)
    // A transport obligation (owned by transporters-select) is dead — its page
    // was dropped; a commodities obligation is not.
    const deadObligations = problems.map((problem) => problem.obligation)
    expect(deadObligations).toContain('transporterType')
    expect(deadObligations).not.toContain('commodityLines')
  })

  it('Should have teeth at depth — biting when the commodities page is dropped', () => {
    // Every in-scope obligation the commodities page owns must be reported as a
    // dead end once that page is removed from the reachable set. Self-calibrated
    // from the real scope so the assertion tracks the manifest, not a literal.
    const commodityKeys = [...makeScope(submitReadySeed).inScope].filter(
      (key) =>
        pageOfObligation(key) === 'commodities' &&
        !SYSTEM_POPULATED.has(
          key
            .replace(/\[\d+\]/g, '')
            .split('.')
            .pop()
        )
    )
    expect(commodityKeys.length).toBeGreaterThan(0)
    const pagesFor = (answers) =>
      simulateJourney(answers).filter((pageId) => pageId !== 'commodities')
    const deadEnds = proveFlowReachability({ pagesFor })
      .filter(
        (problem) => problem.reason === 'owning-page-unreachable-in-scope'
      )
      .map((problem) => problem.obligation)
    for (const key of commodityKeys) expect(deadEnds).toContain(key)
  })

  it('Should report no-owning-page when an in-scope obligation has no page', () => {
    // Inject a scope carrying an obligation dispatch never indexed. pageOfObl
    // returns undefined → the no-owning-page branch fires.
    const scopeFor = () => ({ inScope: new Set(['obligationWithNoPage']) })
    const problems = proveFlowReachability({ scopeFor, pagesFor: () => [] })
    expect(problems).toEqual([
      { obligation: 'obligationWithNoPage', reason: 'no-owning-page' }
    ])
  })
})
