import { describe, expect, it } from 'vitest'
import { reconcile } from './reconcile.js'

/** The scope + scope-exit-wipe invariants — pure, page-agnostic. */
describe('reconcile', () => {
  it('places root obligations in scope and gates the rest', () => {
    const { inScope } = reconcile({})
    expect(inScope.has('fullName')).toBe(true)
    expect(inScope.has('email')).toBe(true)
    expect(inScope.has('claims')).toBe(false) // hadClaims not 'yes'
    expect(inScope.has('excessAmount')).toBe(false)
    expect(inScope.has('driverName')).toBe(false)
  })

  it('activates the claims collection when hadClaims is yes', () => {
    expect(reconcile({ hadClaims: 'yes' }).inScope.has('claims')).toBe(true)
    expect(reconcile({ hadClaims: 'no' }).inScope.has('claims')).toBe(false)
  })

  it('wipes claims data when hadClaims leaves the yes scope (destroyed, not hidden)', () => {
    const answers = {
      hadClaims: 'no',
      claims: [{ claimType: 'accident', claimAmount: '500' }]
    }
    expect(reconcile(answers).wiped).toContain('claims')
  })

  it('activates addon detail obligations on selection and wipes them on deselect', () => {
    const on = reconcile({ addons: ['named-driver'] }).inScope
    expect(on.has('driverName')).toBe(true)
    expect(on.has('relationship')).toBe(true)
    expect(on.has('modDescription')).toBe(false)

    const off = reconcile({
      addons: [],
      driverName: 'Sam',
      relationship: 'spouse'
    })
    expect(off.inScope.has('driverName')).toBe(false)
    expect(off.wiped).toEqual(
      expect.arrayContaining(['driverName', 'relationship'])
    )
  })

  it('reveals + wipes excessAmount with the voluntaryExcess answer', () => {
    expect(
      reconcile({ voluntaryExcess: 'yes' }).inScope.has('excessAmount')
    ).toBe(true)
    expect(
      reconcile({ voluntaryExcess: 'no', excessAmount: '250' }).wiped
    ).toContain('excessAmount')
  })

  it('brings the system premium into scope once cover is chosen', () => {
    expect(reconcile({}).inScope.has('premium')).toBe(false)
    expect(
      reconcile({ coverType: 'comprehensive' }).inScope.has('premium')
    ).toBe(true)
  })
})
