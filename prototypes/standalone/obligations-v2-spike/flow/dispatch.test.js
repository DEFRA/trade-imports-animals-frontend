import { beforeAll, describe, expect, it } from 'vitest'
import { dispatchPages } from '../pages/registry.js'
import { reconcile } from '../state/reconcile.js'
import { readyForQuote } from '../state/status.js'
import { buildDispatch, collectsOf, pageOfObligation } from './dispatch.js'
import { nextInSection, sectionEntry } from './navigation.js'

/** Boot coverage, dispatch inversion, navigation and quote-readiness. */
describe('dispatch + flow', () => {
  beforeAll(() => buildDispatch(dispatchPages))

  it('coverage-asserts every non-system obligation to exactly one page', () => {
    expect(() => buildDispatch(dispatchPages)).not.toThrow()
    expect(pageOfObligation('fullName')).toBe('about-you')
    expect(pageOfObligation('claims')).toBe('claims')
    expect(pageOfObligation('excessAmount')).toBe('cover-type')
    expect(collectsOf('about-you')).toContain('fullName')
  })

  it('walks the driving-and-cover section, skipping claims when out of scope', () => {
    const scopeNoClaims = { inScope: reconcile({ hadClaims: 'no' }).inScope }
    const scopeClaims = { inScope: reconcile({ hadClaims: 'yes' }).inScope }
    expect(nextInSection('driving-history', scopeClaims)).toMatch(/\/claims$/)
    expect(nextInSection('driving-history', scopeNoClaims)).toMatch(
      /\/cover-type$/
    )
    expect(nextInSection('optional-extras', scopeClaims)).toMatch(/\/hub$/)
  })

  it('enters an addon section only at its first gated-in page', () => {
    const scope = { inScope: reconcile({ addons: ['named-driver'] }).inScope }
    expect(sectionEntry('named-driver', scope)).toMatch(
      /\/addons\/named-driver\/who$/
    )
  })

  it('unlocks the quote only once every other section is complete', () => {
    const complete = {
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
    // hadClaims yes but no claim entry -> claims section not Fulfilled
    expect(readyForQuote(incomplete, reconcile(incomplete).inScope)).toBe(false)
  })
})
