import { beforeAll, describe, expect, it } from 'vitest'

import { buildDispatch } from '../flow/dispatch.js'
import { dispatchPages } from '../features/index.js'
import { enumerateScopeStates, proveReachability } from './reachability.js'

/** The model-level dead-end prover (entry 4). */
describe('reachability / dead-end prover', () => {
  beforeAll(() => buildDispatch(dispatchPages))

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
    expect(problems.map((p) => p.obligation)).toContain('driverName')
    expect(
      problems.every((p) => p.reason === 'owning-page-unreachable-in-scope')
    ).toBe(true)
  })
})
