import { describe, expect, it } from 'vitest'

import { copy as cy } from './copy.cy.js'
import { copy as en } from './copy.en.js'

const shape = (value) =>
  Object.fromEntries(
    Object.entries(value).map(([key, child]) => [
      key,
      child !== null && typeof child === 'object' ? shape(child) : typeof child
    ])
  )

const leaves = (node, path = []) =>
  typeof node === 'object' && node !== null
    ? Object.entries(node).flatMap(([key, value]) =>
        leaves(value, [...path, key])
      )
    : [{ path: path.join('.'), value: node }]

describe('plant-products goods-movement copy', () => {
  it('keeps English and Welsh structure-identical with non-empty leaves', () => {
    expect(shape(cy)).toEqual(shape(en))
    for (const bundle of [en, cy]) {
      for (const { path, value } of leaves(bundle)) {
        expect(typeof value, `${path} must be a string`).toBe('string')
        expect(value.trim(), `${path} must not be empty`).not.toBe('')
      }
    }
  })

  it('pins the three canonical point-of-answer errors', () => {
    expect(en.errors).toEqual({
      commonTransitConventionRequired:
        'Select if using the Common Transit Convention (CTC)',
      movementReferenceNumberInvalid: 'Enter a valid Movement Reference Number',
      usingGvmsRequired:
        'Select if using the Goods Vehicle Movement Service (GVMS)'
    })
  })

  it('pins every canonical option and outbound-link label', () => {
    expect(en.ctc.options).toEqual({
      ADD_MRN_NOW: 'Yes – add MRN now',
      ADD_MRN_LATER: 'Yes – add MRN later',
      NO: 'No'
    })
    expect(en.gvms.options).toEqual({ yes: 'Yes', no: 'No' })
    expect(en.ctcDetails.linkText).toBe(
      'Find out more about using transit to move goods (opens in new tab)'
    )
    expect(en.gvmsDetails.links).toEqual({
      portsList: 'Find out which ports use the GVMS (opens in new tab)',
      register: 'Register for the GVMS (opens in new tab)',
      gmr: 'Get a goods movement reference (GMR) (opens in new tab)'
    })
  })
})
