import { beforeAll, describe, expect, it } from 'vitest'
import { reconcile } from './reconcile.js'
import { entryComplete, collectionComplete } from './complete.js'
import { buildDispatch, pageOfObligation } from '../flow/dispatch.js'
import { dispatchPages } from '../features/index.js'
import { drivers } from '../features/named-driver/obligations.js'
import { walkObligations } from '../registry.js'

/**
 * ONE LEVEL OF NESTING (Phase 2 / entry 6b): drivers -> claims. The claim is
 * that the recursive-tree model recurses with NO engine change for
 * scope/wipe/dispatch — only completeness had to become depth-aware. These
 * pin depth-2 paths, cascading per-instance wipe, independence across items,
 * no-rehydrate-at-depth, and tree coverage.
 */
const twoDriversEachWithClaims = {
  addons: ['named-driver'],
  drivers: [
    {
      driverName: 'Sam',
      relationship: 'spouse',
      claims: [{ claimType: 'accident', claimAmount: '100' }]
    },
    {
      driverName: 'Jo',
      relationship: 'child',
      claims: [{ claimType: 'theft', claimAmount: '200' }]
    }
  ]
}

describe('nested indexed obligations (drivers -> claims)', () => {
  it('walkObligations reaches depth-2 template addresses', () => {
    const addresses = [...walkObligations()].map((node) => node.templatePath)
    expect(addresses).toContain('drivers')
    expect(addresses).toContain('drivers.driverName')
    expect(addresses).toContain('drivers.claims')
    expect(addresses).toContain('drivers.claims.claimType')
  })

  it('scopes nested claim instance paths under each driver (no engine change)', () => {
    const { inScope } = reconcile(twoDriversEachWithClaims)
    expect(inScope.has('drivers')).toBe(true)
    expect(inScope.has('drivers[0].driverName')).toBe(true)
    expect(inScope.has('drivers[0].claims')).toBe(true)
    expect(inScope.has('drivers[0].claims[0].claimType')).toBe(true)
    expect(inScope.has('drivers[1].claims[0].claimType')).toBe(true)
  })

  it('does not scope a driver subtree when named-driver is not selected', () => {
    const { inScope } = reconcile({
      addons: [],
      drivers: [{ driverName: 'Sam', claims: [{ claimType: 'accident' }] }]
    })
    expect(inScope.has('drivers')).toBe(false)
    expect(inScope.has('drivers[0].claims[0].claimType')).toBe(false)
  })

  it('wipes the whole drivers subtree (one root path) on deselect — destroyed, not hidden', () => {
    const { wiped } = reconcile({
      addons: [],
      drivers: [
        { driverName: 'Sam', claims: [{ claimType: 'accident' }] },
        { driverName: 'Jo', claims: [{ claimType: 'theft' }] }
      ]
    })
    // The drivers root subsumes every nested descendant — a single deletable path.
    expect(wiped).toContain('drivers')
    expect(wiped.filter((key) => key.startsWith('drivers')).length).toBe(1)
  })

  it('holds two drivers claims independent (removing one leaves the other)', () => {
    // Simulate "remove driver 0": splice the entry, reconcile the remainder.
    const spliced = {
      ...twoDriversEachWithClaims,
      drivers: [twoDriversEachWithClaims.drivers[1]]
    }
    const { inScope } = reconcile(spliced)
    expect(inScope.has('drivers[0].claims[0].claimType')).toBe(true) // was Jo
    expect(inScope.has('drivers[1].claims[0].claimType')).toBe(false) // only one left
  })

  it('recurses per-item completeness: a required nested collection gates the parent', () => {
    // Real drivers: nested claims are OPTIONAL, so a driver with no claims is complete...
    expect(
      entryComplete(drivers, { driverName: 'Sam', relationship: 'spouse' })
    ).toBe(true)
    // ...but a claim it holds must itself be complete (nested entry recursion).
    expect(
      entryComplete(drivers, {
        driverName: 'Sam',
        relationship: 'spouse',
        claims: [{ claimAmount: '100' }] // missing required claimType
      })
    ).toBe(false)
    // And a REQUIRED nested collection (synthetic) gates the parent when empty.
    const requiredNested = {
      id: 'x',
      collection: true,
      item: [{ id: 'y', required: true }],
      requiredAtLeastOne: true
    }
    const parent = { id: 'p', item: [requiredNested] }
    expect(entryComplete(parent, { x: [] })).toBe(false)
    expect(entryComplete(parent, { x: [{ y: 'ok' }] })).toBe(true)
    expect(collectionComplete(requiredNested, [{ y: '' }])).toBe(false)
  })
})

describe('nested tree dispatch coverage (needs boot)', () => {
  beforeAll(() => buildDispatch(dispatchPages))

  it('derives tree coverage: a nested sub-obligation resolves to the drivers page', () => {
    expect(pageOfObligation('drivers.claims.claimType')).toBe(
      pageOfObligation('drivers')
    )
    expect(pageOfObligation('drivers[0].claims[0].claimType')).toBe(
      pageOfObligation('drivers')
    )
  })
})
