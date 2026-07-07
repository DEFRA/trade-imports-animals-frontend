import { beforeAll, describe, expect, it } from 'vitest'
import { dispatchPages } from '../features/index.js'
import { reconcile } from '../engine/evaluate/reconcile.js'
import { readyForQuote } from './section-status.js'
import { buildDispatch, collectsOf, pageOfObligation } from './dispatch.js'
import { nextInSection, sectionEntry } from './navigation.js'

describe('dispatch + flow', () => {
  beforeAll(() => buildDispatch(dispatchPages))

  it('Should assert coverage of every non-system obligation to exactly one page', () => {
    expect(() => buildDispatch(dispatchPages)).not.toThrow()
    expect(pageOfObligation('fullName')).toBe('about-you')
    expect(pageOfObligation('claims')).toBe('claims')
    expect(pageOfObligation('excessAmount')).toBe('cover-type')
    expect(collectsOf('about-you')).toContain('fullName')
  })

  it('Should crash boot when an obligation (and its derived sub-obligations) is uncovered', () => {
    const withoutClaims = dispatchPages.filter((page) => page.id !== 'claims')
    expect(() => buildDispatch(withoutClaims)).toThrow(/collected by no page/)
    expect(() => buildDispatch(withoutClaims)).toThrow(/claims/)
    buildDispatch(dispatchPages) // restore the shared index for later tests
  })

  it('Should resolve a sub-obligation to its collection owner by template and instance address', () => {
    expect(pageOfObligation('claims.claimType')).toBe('claims')
    // The engine addresses instances in bracketed pathKey form; ownership must
    // resolve that vocabulary too, else per-item change links break.
    expect(pageOfObligation('claims[0].claimType')).toBe('claims')
    expect(pageOfObligation('claims[0]')).toBe('claims')
  })

  it('Should walk the driving-and-cover section, skipping claims when out of scope', () => {
    const scopeNoClaims = { inScope: reconcile({ hadClaims: 'no' }).inScope }
    const scopeClaims = { inScope: reconcile({ hadClaims: 'yes' }).inScope }
    expect(nextInSection('driving-history', scopeClaims)).toMatch(/\/claims$/)
    expect(nextInSection('driving-history', scopeNoClaims)).toMatch(
      /\/cover-type$/
    )
    expect(nextInSection('optional-extras', scopeClaims)).toMatch(/\/hub$/)
  })

  it('Should enter an addon section only at its first gated-in page', () => {
    const scope = { inScope: reconcile({ addons: ['named-driver'] }).inScope }
    expect(sectionEntry('named-driver', scope)).toMatch(
      /\/addons\/named-driver$/
    )
  })

  it('Should unlock the quote only once every other section is complete', () => {
    const complete = {
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
      email: 'a@b.co',
      fullName: 'Alex',
      hadClaims: 'yes',
      claims: [{ claimType: 'accident', claimAmount: '500' }],
      coverType: 'comprehensive'
    }
    const { inScope } = reconcile(complete)
    expect(readyForQuote(complete, inScope)).toBe(true)

    const incomplete = {
      email: 'a@b.co',
      fullName: 'Alex',
      hadClaims: 'yes',
      coverType: 'comprehensive'
    }
    expect(readyForQuote(incomplete, reconcile(incomplete).inScope)).toBe(false)
  })
})
