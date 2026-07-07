import { describe, expect, it } from 'vitest'
import { reconcile } from './reconcile.js'

/** The scope + scope-exit-wipe invariants — pure, page-agnostic. */
describe('#reconcile', () => {
  it('Should place root obligations in scope and gate the rest', () => {
    const { inScope } = reconcile({})
    expect(inScope.has('fullName')).toBe(true)
    expect(inScope.has('email')).toBe(true)
    expect(inScope.has('claims')).toBe(false) // hadClaims not 'yes'
    expect(inScope.has('excessAmount')).toBe(false)
    expect(inScope.has('driverName')).toBe(false)
  })

  it('Should activate the claims collection when hadClaims is yes', () => {
    expect(reconcile({ hadClaims: 'yes' }).inScope.has('claims')).toBe(true)
    expect(reconcile({ hadClaims: 'no' }).inScope.has('claims')).toBe(false)
  })

  it('Should wipe claims data when hadClaims leaves the yes scope (destroyed, not hidden)', () => {
    const answers = {
      hadClaims: 'no',
      claims: [{ claimType: 'accident', claimAmount: '500' }]
    }
    expect(reconcile(answers).wiped).toContain('claims')
  })

  it('Should activate the drivers collection on selection and wipe it on deselect', () => {
    const on = reconcile({ addons: ['named-driver'] }).inScope
    expect(on.has('drivers')).toBe(true)
    expect(on.has('modDescription')).toBe(false)

    const off = reconcile({
      addons: [],
      drivers: [{ driverName: 'Sam', relationship: 'spouse' }]
    })
    expect(off.inScope.has('drivers')).toBe(false)
    expect(off.wiped).toContain('drivers')
  })

  it('Should reveal and wipe excessAmount with the voluntaryExcess answer', () => {
    expect(
      reconcile({ voluntaryExcess: 'yes' }).inScope.has('excessAmount')
    ).toBe(true)
    expect(
      reconcile({ voluntaryExcess: 'no', excessAmount: '250' }).wiped
    ).toContain('excessAmount')
  })

  it('Should bring the system premium into scope once cover is chosen', () => {
    expect(reconcile({}).inScope.has('premium')).toBe(false)
    expect(
      reconcile({ coverType: 'comprehensive' }).inScope.has('premium')
    ).toBe(true)
  })
})
