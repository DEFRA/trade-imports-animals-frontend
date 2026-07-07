import { beforeAll, describe, expect, it } from 'vitest'
import { reconcile } from './engine/evaluate/reconcile.js'
import { FULFILLED, IN_PROGRESS, NOT_STARTED, NA } from './engine/status.js'
import { readyForQuote, sectionStatus } from './flow/section-status.js'
import { sections } from './flow/flow.js'
import { walkObligations } from './registry.js'
import { buildDispatch } from './flow/dispatch.js'
import { dispatchPages } from './features/index.js'

/**
 * FIRST-CLASS INDEXED OBLIGATIONS (Phase 1). The engine must SEE a
 * collection's sub-obligations as real obligations: per-instance scope,
 * per-instance wipe, and per-item completeness. These pin the new model
 * facts the pre-Phase-1 engine could not express (DISCUSSION-LOG entry 6,
 * findings 1-4).
 */
const drivingCoverSection = sections.find(
  (section) => section.id === 'your-driving-and-cover'
)

describe('indexed obligations are first-class', () => {
  // sectionStatus / readyForQuote read the dispatch index (collectsOf), so the
  // boot inversion must run first — same as dispatch.test / contract.test.
  beforeAll(() => buildDispatch(dispatchPages))

  it('Should enumerate sub-obligations at every depth via walkObligations', () => {
    const addresses = [...walkObligations()].map((node) => node.templatePath)
    expect(addresses).toContain('claims')
    expect(addresses).toContain('claims.claimType')
    expect(addresses).toContain('claims.claimAmount')
  })

  it('Should scope each stored claim instance path when the collection is in scope', () => {
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

  it('Should not scope any claim sub-obligation when the collection is out of scope', () => {
    const { inScope } = reconcile({
      hadClaims: 'no',
      claims: [{ claimType: 'accident', claimAmount: '500' }]
    })
    expect(inScope.has('claims')).toBe(false)
    expect(inScope.has('claims[0].claimType')).toBe(false)
  })

  it('Should wipe the whole collection as a single root path when it leaves scope', () => {
    const { wiped } = reconcile({
      hadClaims: 'no',
      claims: [{ claimType: 'accident', claimAmount: '500' }]
    })
    // Wiped is path-shaped; the root path deletes the subtree — descendants
    // are deduped away (destroyed with the parent, not listed separately).
    const wipedKeys = wiped.map((path) =>
      Array.isArray(path) ? path.join('.') : path
    )
    expect(wipedKeys).toContain('claims')
    expect(wiped.some((path) => Array.isArray(path) && path.length > 1)).toBe(
      false
    )
  })

  it('Should treat a claim with a blank required sub-field as incomplete (per-item completeness)', () => {
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

  it('Should roll per-item completeness into the driving-and-cover section status', () => {
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

/**
 * SECTION STATUS OVER A COLLECTION-ONLY SECTION. The named-driver section
 * collects exactly one obligation — the `drivers` collection — so nothing else
 * can carry the section's In Progress state. A partially-filled collection MUST
 * read In Progress, never Not Started: showing "Not started" on the hub while
 * several drivers are already entered is a status lie the journey cannot
 * tolerate. Regression guard for the `satisfied`→`isStarted` fix.
 */
describe('a section whose only obligation is a collection', () => {
  beforeAll(() => buildDispatch(dispatchPages))

  const namedDriverSection = sections.find(
    (section) => section.id === 'named-driver'
  )
  const statusFor = (answers) =>
    sectionStatus(namedDriverSection, answers, reconcile(answers).inScope)

  it('Should be In Progress — not Not Started — while the collection is partially filled', () => {
    // A driver entered but missing its required `relationship`: the collection
    // holds an entry (so it is STARTED) but is not complete (so not Fulfilled).
    const answers = {
      addons: ['named-driver'],
      drivers: [{ driverName: 'Priya Raman' }]
    }
    expect(statusFor(answers)).toBe(IN_PROGRESS)
    expect(statusFor(answers)).not.toBe(NOT_STARTED)
  })

  it('Should be In Progress when a nested claim, deep in the tree, is the only gap', () => {
    // Every driver field complete, but one driver holds a windscreen claim with
    // no provider — the incompleteness is two levels down, yet it must still
    // pull the whole section off Fulfilled and onto In Progress (not Not Started).
    const answers = {
      addons: ['named-driver'],
      drivers: [
        {
          driverName: 'Marcus Webb',
          relationship: 'child',
          claims: [{ claimType: 'windscreen', claimAmount: '400' }]
        }
      ]
    }
    expect(statusFor(answers)).toBe(IN_PROGRESS)
  })

  it('Should be Not Started only when the collection is genuinely empty', () => {
    // In scope (add-on selected) but zero entries: nothing started yet.
    expect(statusFor({ addons: ['named-driver'], drivers: [] })).toBe(
      NOT_STARTED
    )
  })

  it('Should be Fulfilled when every entry — and every nested entry — is complete', () => {
    const answers = {
      addons: ['named-driver'],
      drivers: [
        { driverName: 'Jordan Fielding', relationship: 'spouse', claims: [] },
        {
          driverName: 'Priya Raman',
          relationship: 'named',
          claims: [
            {
              claimType: 'windscreen',
              claimAmount: '300',
              windscreenProvider: 'autoglass'
            }
          ]
        }
      ]
    }
    expect(statusFor(answers)).toBe(FULFILLED)
  })

  it('Should be Not Applicable when the named-driver add-on is not selected', () => {
    expect(statusFor({ addons: [], drivers: [] })).toBe(NA)
  })
})
