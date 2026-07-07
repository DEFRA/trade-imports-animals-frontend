import { beforeAll, describe, expect, it } from 'vitest'
import { reconcile } from './engine/evaluate/reconcile.js'
import { entryComplete } from './engine/evaluate/complete.js'
import { readyForQuote } from './flow/section-status.js'
import { claims } from './features/claims/obligations.js'
import { buildDispatch } from './flow/dispatch.js'
import { dispatchPages } from './features/index.js'

const claimsPersona = (types) => ({
  hadClaims: 'yes',
  claims: types.map((claimType) => ({ claimType, claimAmount: '100' }))
})

describe('item-scoped conditionality (windscreen → provider)', () => {
  it('Should scope windscreenProvider for a windscreen claim only, per instance', () => {
    const { inScope } = reconcile(claimsPersona(['accident', 'windscreen']))
    expect(inScope.has('claims[0].windscreenProvider')).toBe(false) // accident
    expect(inScope.has('claims[1].windscreenProvider')).toBe(true) // windscreen
  })

  it('Should resolve the predicate at full depth (drivers[i].claims[j])', () => {
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

  it('Should wipe the provider at that exact path when the claim leaves windscreen', () => {
    const { wiped } = reconcile({
      hadClaims: 'yes',
      claims: [
        { claimType: 'windscreen', windscreenProvider: 'autoglass' },
        { claimType: 'accident', windscreenProvider: 'kwik-fit' } // stale
      ]
    })
    expect(wiped).toContain('claims[1].windscreenProvider')
    expect(wiped).not.toContain('claims[0].windscreenProvider')
  })

  it('Should keep two windscreen claims providers independent', () => {
    const { inScope } = reconcile(claimsPersona(['windscreen', 'windscreen']))
    expect(inScope.has('claims[0].windscreenProvider')).toBe(true)
    expect(inScope.has('claims[1].windscreenProvider')).toBe(true)
  })

  it('Should make item-relative completeness respect the sibling', () => {
    expect(
      entryComplete(claims, { claimType: 'windscreen', claimAmount: '100' })
    ).toBe(false)
    expect(
      entryComplete(claims, { claimType: 'accident', claimAmount: '100' })
    ).toBe(true)
    expect(
      entryComplete(claims, {
        claimType: 'windscreen',
        claimAmount: '100',
        windscreenProvider: 'autoglass'
      })
    ).toBe(true)
  })

  it('Should apply the item-relative gate by sibling identity, not id-keying (resolver unity)', () => {
    // The gate fires only for true siblings — the SAME criterion reconcile
    // uses, so entryComplete and reconcile cannot diverge; a non-sibling ref
    // is owed conservatively, not skipped.
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

  it('Should lock readyForQuote for a windscreen claim missing its provider', () => {
    const base = {
      countryOfOrigin: 'FR',
      regionOfOriginCodeRequirement: 'no',
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
