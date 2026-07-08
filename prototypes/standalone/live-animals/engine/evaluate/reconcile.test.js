import { describe, expect, it } from 'vitest'
import { reconcile } from './reconcile.js'

describe('#reconcile', () => {
  it('Should place root obligations in scope and gate the rest', () => {
    const { inScope } = reconcile({})
    expect(inScope.has('internalReferenceNumber')).toBe(true)
    expect(inScope.has('countryOfOrigin')).toBe(true)
    expect(inScope.has('regionOfOriginCode')).toBe(false)
    expect(inScope.has('commercialTransporter')).toBe(false)
  })

  it('Should activate the matching transporter spoke for the chosen type only', () => {
    const commercial = reconcile({
      transporterType: 'Commercial transporter'
    }).inScope
    expect(commercial.has('commercialTransporter')).toBe(true)
    expect(commercial.has('privateTransporter')).toBe(false)

    const privateSpoke = reconcile({
      transporterType: 'Private transporter'
    }).inScope
    expect(privateSpoke.has('privateTransporter')).toBe(true)
    expect(privateSpoke.has('commercialTransporter')).toBe(false)
  })

  it('Should wipe a saved transporter when the type leaves its branch (destroyed, not hidden)', () => {
    const answers = {
      transporterType: 'Private transporter',
      commercialTransporter: {
        name: 'Channel Livestock Logistics Ltd',
        address: { addressLine1: '18 Eastern Docks' }
      }
    }
    expect(reconcile(answers).wiped).toContain('commercialTransporter')
  })

  it('Should reveal and wipe regionOfOriginCode with the requirement answer', () => {
    expect(
      reconcile({ regionOfOriginCodeRequirement: 'yes' }).inScope.has(
        'regionOfOriginCode'
      )
    ).toBe(true)
    expect(
      reconcile({
        regionOfOriginCodeRequirement: 'no',
        regionOfOriginCode: 'FR-75'
      }).wiped
    ).toContain('regionOfOriginCode')
  })
})
