import { beforeAll, describe, expect, it } from 'vitest'

import { buildDispatch } from '../flow/dispatch.js'
import { readyForQuote } from '../flow/section-status.js'
import { configureReadyForQuote } from '../engine/read.js'
import { dispatchPages } from '../features/index.js'
import {
  buildWitnesses,
  enumerateScopeStates,
  orphanedRootIds,
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
    // regionOfOriginCodeRequirement(2) x reasonForImport(2)
    // x meansOfTransport(2) x transporterType(3)
    expect(enumerateScopeStates()).toHaveLength(24)
  })

  it('Should prove no owed obligation is ever unreachable', () => {
    expect(proveReachability()).toEqual([])
  })

  it('Should have teeth — reporting a dead end if an owning page becomes unreachable', () => {
    // Inject a reachability oracle that pretends only the first two sections'
    // pages ever open.
    const pagesFor = () => ['origin', 'commodities']
    const problems = proveReachability({ pagesFor })
    expect(problems.length).toBeGreaterThan(0)
    expect(problems.map((problem) => problem.obligation)).toContain('documents')
    expect(
      problems.every(
        (problem) => problem.reason === 'owning-page-unreachable-in-scope'
      )
    ).toBe(true)
  })

  it('Should exclude the last stub-activated obligation from the witness set (premium coverType stub, dies inc-028)', () => {
    // inc-027 removed protected-ncd (ncdYears) — the last add-on section — so
    // the self-emptying exclusion set is down to its final member: `premium`,
    // activated off the unregistered `coverType` stub in the quote feature.
    // It is system:true (computed, never collected) so the witness set excludes
    // it regardless; it awaits its own removal in inc-028.
    expect([...orphanedRootIds]).toEqual(['premium'])
    const targets = buildWitnesses().map((witness) => witness.targetKey)
    expect(targets).not.toContain('premium')
  })

  it('Should witness the item-conditional obligation inside a collection item (the closed hole)', () => {
    const targets = buildWitnesses().map((witness) => witness.targetKey)
    expect(targets).toContain('commodityLines[0].numberOfPackages')
  })

  it('Should actually put the item-conditional obligation in scope (not a null witness)', () => {
    const byKey = new Map(
      buildWitnesses().map((witness) => [witness.targetKey, witness])
    )
    expect(
      byKey.get('commodityLines[0].numberOfPackages')?.answers
    ).not.toBeNull()
  })

  it('Should have teeth at depth — biting when the commodities hub page is dropped', () => {
    // Drop only the collection-hub page — the item-conditional obligation
    // lives at depth and its DERIVED owning page is the dropped hub.
    const pagesFor = (answers) =>
      simulateJourney(answers).filter((pageId) => pageId !== 'commodities')
    const problems = proveReachability({ pagesFor })
    const deadEnds = problems
      .filter(
        (problem) => problem.reason === 'owning-page-unreachable-in-scope'
      )
      .map((problem) => problem.targetKey)
    expect(deadEnds).toContain('commodityLines[0].numberOfPackages')
    const packages = problems.find(
      (problem) => problem.targetKey === 'commodityLines[0].numberOfPackages'
    )
    expect(packages.pageId).toBe('commodities')
  })
})
