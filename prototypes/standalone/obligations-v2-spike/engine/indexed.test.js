import { beforeAll, describe, expect, it } from 'vitest'
import { reconcile } from './reconcile.js'
import {
  readyForQuote,
  sectionStatus,
  FULFILLED,
  IN_PROGRESS
} from './status.js'
import { sections } from '../flow/flow.js'
import { walkDefs } from '../registry.js'
import { buildDispatch } from '../flow/dispatch.js'
import { dispatchPages } from '../features/index.js'

/**
 * FIRST-CLASS INDEXED OBLIGATIONS (Phase 1). The engine must SEE a
 * collection's sub-obligations as real obligations: per-instance scope,
 * per-instance wipe, and per-item completeness. These pin the new model
 * facts the pre-Phase-1 engine could not express (DISCUSSION-LOG entry 6,
 * findings 1-4).
 */
const drivingCoverSection = sections.find(
  (s) => s.id === 'your-driving-and-cover'
)

describe('indexed obligations are first-class', () => {
  // sectionStatus / readyForQuote read the dispatch index (collectsOf), so the
  // boot inversion must run first — same as dispatch.test / contract.test.
  beforeAll(() => buildDispatch(dispatchPages))

  it('registry.walkDefs enumerates sub-obligations at every depth', () => {
    const addresses = [...walkDefs()].map((n) => n.templatePath)
    expect(addresses).toContain('claims')
    expect(addresses).toContain('claims.claimType')
    expect(addresses).toContain('claims.claimAmount')
  })

  it('scopes each stored claim instance path when the collection is in scope', () => {
    const { inScope } = reconcile({
      hadClaims: 'yes',
      claims: [
        { claimType: 'accident', claimAmount: '500' },
        { claimType: 'theft', claimAmount: '900' }
      ]
    })
    expect(inScope.has('claims')).toBe(true)
    expect(inScope.has('claims[0].claimType')).toBe(true)
    expect(inScope.has('claims[0].claimAmount')).toBe(true)
    expect(inScope.has('claims[1].claimType')).toBe(true)
    expect(inScope.has('claims[1].claimAmount')).toBe(true)
  })

  it('does not scope any claim sub-obligation when the collection is out of scope', () => {
    const { inScope } = reconcile({
      hadClaims: 'no',
      claims: [{ claimType: 'accident', claimAmount: '500' }]
    })
    expect(inScope.has('claims')).toBe(false)
    expect(inScope.has('claims[0].claimType')).toBe(false)
  })

  it('wipes the whole collection (a single root path) when it leaves scope', () => {
    const { wiped } = reconcile({
      hadClaims: 'no',
      claims: [{ claimType: 'accident', claimAmount: '500' }]
    })
    // Wiped is path-shaped; the root path deletes the subtree — descendants
    // are deduped away (destroyed with the parent, not listed separately).
    const wipedKeys = wiped.map((p) => (Array.isArray(p) ? p.join('.') : p))
    expect(wipedKeys).toContain('claims')
    expect(wiped.some((p) => Array.isArray(p) && p.length > 1)).toBe(false)
  })

  it('treats a claim with a blank REQUIRED sub-field as incomplete (per-item completeness)', () => {
    const complete = {
      email: 'a@b.co',
      fullName: 'Alex',
      hadClaims: 'yes',
      claims: [{ claimType: 'accident', claimAmount: '500' }],
      coverType: 'comprehensive'
    }
    // claimType is required; an entry missing it is NOT a complete claim.
    const incomplete = {
      ...complete,
      claims: [{ claimAmount: '500' }]
    }
    expect(readyForQuote(complete, reconcile(complete).inScope)).toBe(true)
    expect(readyForQuote(incomplete, reconcile(incomplete).inScope)).toBe(false)
  })

  it('rolls per-item completeness into the driving-and-cover section status', () => {
    const withIncompleteClaim = {
      hadClaims: 'yes',
      claims: [{ claimAmount: '500' }], // missing required claimType
      coverType: 'comprehensive'
    }
    const withCompleteClaim = {
      hadClaims: 'yes',
      claims: [{ claimType: 'accident', claimAmount: '500' }],
      coverType: 'comprehensive'
    }
    expect(
      sectionStatus(
        drivingCoverSection,
        withIncompleteClaim,
        reconcile(withIncompleteClaim).inScope
      )
    ).toBe(IN_PROGRESS)
    expect(
      sectionStatus(
        drivingCoverSection,
        withCompleteClaim,
        reconcile(withCompleteClaim).inScope
      )
    ).toBe(FULFILLED)
  })
})
