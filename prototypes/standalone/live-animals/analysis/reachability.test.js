import { beforeAll, describe, expect, it } from 'vitest'

import { buildDispatch } from '../flow/dispatch.js'
import { readyForCheckYourAnswers } from '../flow/section-status.js'
import { configureReadyForCheckYourAnswers } from '../engine/read.js'
import { dispatchPages } from '../features/index.js'
import {
  buildWitnesses,
  enumerateScopeStates,
  orphanedRootIds,
  proveReachability
} from './reachability.js'
import { simulateJourney } from './simulate.js'

describe('reachability / dead-end prover', () => {
  beforeAll(() => {
    buildDispatch(dispatchPages)
    configureReadyForCheckYourAnswers(readyForCheckYourAnswers)
  })

  it('Should enumerate a small finite scope space', () => {
    expect(enumerateScopeStates()).toHaveLength(24)
  })

  it('Should prove no owed obligation is ever unreachable', () => {
    expect(proveReachability()).toEqual([])
  })

  it('Should have teeth — reporting a dead end if an owning page becomes unreachable', () => {
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

  it('Should carry no orphaned stub-activated roots — the self-emptying set is empty', () => {
    expect([...orphanedRootIds]).toEqual([])
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
