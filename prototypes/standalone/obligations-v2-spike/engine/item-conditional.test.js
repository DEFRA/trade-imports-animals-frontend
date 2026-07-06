import { beforeAll, describe, expect, it } from 'vitest'
import { reconcile } from './reconcile.js'
import { entryComplete } from './complete.js'
import { readyForQuote } from '../flow/section-status.js'
import { claims } from '../features/claims/obligations.js'
import { buildDispatch } from '../flow/dispatch.js'
import { dispatchPages } from '../features/index.js'

/**
 * ITEM-SCOPED CONDITIONALITY (DISCUSSION-LOG entry 6c): a windscreen claim
 * activates its `windscreenProvider` for THAT claim instance only — an
 * item-relative predicate resolved at the claim's exact path, at full depth.
 * These pin: per-instance scope, per-path wipe when a claim changes away from
 * windscreen, independence across claims, and item-relative completeness.
 */
const claimsPersona = (types) => ({
  hadClaims: 'yes',
  claims: types.map((claimType) => ({ claimType, claimAmount: '100' }))
})

describe('item-scoped conditionality (windscreen → provider)', () => {
  it('scopes windscreenProvider for a windscreen claim only, per instance', () => {
    const { inScope } = reconcile(claimsPersona(['accident', 'windscreen']))
    expect(inScope.has('claims[0].windscreenProvider')).toBe(false) // accident
    expect(inScope.has('claims[1].windscreenProvider')).toBe(true) // windscreen
  })

  it('resolves the predicate at FULL depth (drivers[i].claims[j])', () => {
    const { inScope } = reconcile({
      addons: ['named-driver'],
      drivers: [
        {
          driverName: 'Sam',
          relationship: 'spouse',
          claims: [{ claimType: 'windscreen' }, { claimType: 'theft' }]
        }
      ]
    })
    expect(inScope.has('drivers[0].claims[0].windscreenProvider')).toBe(true)
    expect(inScope.has('drivers[0].claims[1].windscreenProvider')).toBe(false)
  })

  it('wipes the provider at that EXACT path when the claim leaves windscreen', () => {
    // claim 1 was windscreen with a provider answered; now changed to accident.
    const { wiped } = reconcile({
      hadClaims: 'yes',
      claims: [
        { claimType: 'windscreen', windscreenProvider: 'autoglass' },
        { claimType: 'accident', windscreenProvider: 'kwik-fit' } // stale
      ]
    })
    expect(wiped).toContain('claims[1].windscreenProvider')
    expect(wiped).not.toContain('claims[0].windscreenProvider') // still windscreen
  })

  it('keeps two windscreen claims providers independent', () => {
    const { inScope } = reconcile(claimsPersona(['windscreen', 'windscreen']))
    expect(inScope.has('claims[0].windscreenProvider')).toBe(true)
    expect(inScope.has('claims[1].windscreenProvider')).toBe(true)
  })

  it('makes item-relative completeness respect the sibling', () => {
    // windscreen claim missing its provider is INCOMPLETE...
    expect(
      entryComplete(claims, { claimType: 'windscreen', claimAmount: '100' })
    ).toBe(false)
    // ...but a non-windscreen claim is complete without one (not owed).
    expect(
      entryComplete(claims, { claimType: 'accident', claimAmount: '100' })
    ).toBe(true)
    // ...and a windscreen claim with a provider is complete.
    expect(
      entryComplete(claims, {
        claimType: 'windscreen',
        claimAmount: '100',
        windscreenProvider: 'autoglass'
      })
    ).toBe(true)
  })

  it('applies the item-relative gate by SIBLING IDENTITY, not id-keying (resolver unity)', () => {
    // A synthetic item sub gated on a NON-sibling (top-level) obligation must NOT
    // be silently treated as not-owed — the gate fires only for true siblings,
    // the SAME criterion reconcile uses, so entryComplete and reconcile cannot
    // diverge. (Before unification, entryComplete read entry[ref.id]=undefined
    // and wrongly reported this COMPLETE.)
    const topLevel = { id: 'topLevel' }
    const gated = {
      id: 'gated',
      required: true,
      activatedBy: { obligation: topLevel, equals: 'yes' } // ref is NOT a sibling
    }
    const obligation = { id: 'x', item: [gated] }
    expect(entryComplete(obligation, {})).toBe(false) // owed (conservative), not skipped
    expect(entryComplete(obligation, { gated: 'answered' })).toBe(true)
  })
})

describe('item-relative completeness gates the quote', () => {
  beforeAll(() => buildDispatch(dispatchPages))

  it('locks readyForQuote for a windscreen claim missing its provider', () => {
    const base = {
      email: 'a@b.co',
      fullName: 'Alex',
      hadClaims: 'yes',
      coverType: 'comprehensive'
    }
    const missing = {
      ...base,
      claims: [{ claimType: 'windscreen', claimAmount: '100' }]
    }
    const supplied = {
      ...base,
      claims: [
        {
          claimType: 'windscreen',
          claimAmount: '100',
          windscreenProvider: 'autoglass'
        }
      ]
    }
    expect(readyForQuote(missing, reconcile(missing).inScope)).toBe(false)
    expect(readyForQuote(supplied, reconcile(supplied).inScope)).toBe(true)
  })
})
