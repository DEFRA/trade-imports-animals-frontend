import { beforeAll, describe, expect, it } from 'vitest'
import { reconcile } from './engine/evaluate/reconcile.js'
import { entryComplete } from './engine/evaluate/complete.js'
import { readyForQuote } from './flow/section-status.js'
import { claims } from './features/claims/obligations.js'
import { commodityLines } from './features/commodities/obligations.js'
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

describe('item-scoped conditionality with a LIST target (commodity → packages)', () => {
  const line = (commoditySelection) => ({
    commoditySelection,
    typeSelection: 'domestic',
    speciesSelection: ['bos-taurus'],
    numberOfAnimalsQuantity: '25'
  })

  it('Should scope numberOfPackages per instance when the commodity is one of the list', () => {
    const { inScope } = reconcile({
      commodityLines: [line('0102 - Cattle'), line('0301 - Fish')]
    })
    expect(inScope.has('commodityLines[0].numberOfPackages')).toBe(true)
    expect(inScope.has('commodityLines[1].numberOfPackages')).toBe(false)
  })

  it('Should wipe a stale package count when the commodity leaves the list', () => {
    const { wiped } = reconcile({
      commodityLines: [
        { ...line('0102 - Cattle'), numberOfPackages: '5' },
        { ...line('0301 - Fish'), numberOfPackages: '9' } // stale
      ]
    })
    expect(wiped).toContain('commodityLines[1].numberOfPackages')
    expect(wiped).not.toContain('commodityLines[0].numberOfPackages')
  })

  it('Should not owe the optional package count for completeness either way', () => {
    expect(entryComplete(commodityLines, line('0102 - Cattle'))).toBe(true)
    expect(entryComplete(commodityLines, line('0301 - Fish'))).toBe(true)
  })
})

describe('item-relative completeness gates the quote', () => {
  beforeAll(() => buildDispatch(dispatchPages))

  it('Should lock readyForQuote for a windscreen claim missing its provider', () => {
    const base = {
      countryOfOrigin: 'FR',
      regionOfOriginCodeRequirement: 'no',
      reasonForImport: 'internal-market',
      purposeInInternalMarket: 'breeding',
      commodityLines: [
        {
          commoditySelection: '0102 - Cattle',
          typeSelection: 'domestic',
          speciesSelection: ['bos-taurus'],
          numberOfPackages: '5',
          numberOfAnimalsQuantity: '25'
        }
      ],
      consignor: {
        name: 'Laiterie du Nord SARL',
        address: { addressLine1: '12 Rue de la Gare', country: 'France' }
      },
      placeOfDestination: {
        name: 'Tech Imports Ltd',
        address: { addressLine1: '643 Main Street', country: 'United Kingdom' }
      },
      placeOfOrigin: {
        name: 'Ferme des Trois Vallées',
        address: { addressLine1: '3 Chemin des Prés', country: 'France' }
      },
      consignee: {
        name: 'Yorkshire Dales Livestock Ltd',
        address: {
          addressLine1: 'Unit 4, Auction Mart Lane',
          country: 'United Kingdom'
        }
      },
      importer: {
        name: 'Albion Livestock Imports Ltd',
        address: {
          addressLine1: '18 Harbour Road',
          country: 'United Kingdom'
        }
      },
      portOfEntry: 'ABERDEEN',
      arrivalDateAtPort: { day: '12', month: '12', year: '2026' },
      meansOfTransport: 'Airplane',
      transportIdentification: 'FR-892-LK',
      transportDocumentReference: 'CMR-2026-884721',
      transporterType: 'Commercial transporter',
      commercialTransporter: {
        name: 'Channel Livestock Logistics Ltd',
        address: {
          addressLine1: '18 Eastern Docks',
          country: 'United Kingdom'
        },
        approvalNumber: 'UK/DOVER/T2/00012345'
      },
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
