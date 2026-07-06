import { beforeAll, describe, expect, it } from 'vitest'
import { dispatchPages } from '../features/index.js'
import { reconcile } from '../engine/reconcile.js'
import { readyForQuote } from './section-status.js'
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

  it('crashes boot when an obligation (and its derived sub-obligations) is uncovered', () => {
    // Teeth: drop the claims page. `claims` is then owned by nobody, and its
    // item sub-obligations (which derive ownership from it) are uncovered too —
    // coverage descends the tree, so boot must throw naming the uncovered root.
    const withoutClaims = dispatchPages.filter((p) => p.id !== 'claims')
    expect(() => buildDispatch(withoutClaims)).toThrow(/collected by no page/)
    expect(() => buildDispatch(withoutClaims)).toThrow(/claims/)
    buildDispatch(dispatchPages) // restore the shared index for later tests
  })

  it('resolves a sub-obligation to its collection owner by template AND instance address', () => {
    // Derived ownership: a claim sub-field is owned by the page owning `claims`.
    expect(pageOfObligation('claims.claimType')).toBe('claims')
    // The engine addresses instances in bracketed pathKey form (from reconcile);
    // ownership must resolve that vocabulary too, else a per-item change link breaks.
    expect(pageOfObligation('claims[0].claimType')).toBe('claims')
    expect(pageOfObligation('claims[0]')).toBe('claims')
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
    // The named-driver add-on section now lands on the drivers collection hub.
    expect(sectionEntry('named-driver', scope)).toMatch(
      /\/addons\/named-driver$/
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
