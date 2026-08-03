import { describe, expect, it } from 'vitest'

import { copy as cy } from './copy.cy.js'
import { copy as en } from './copy.en.js'

const shape = (value) =>
  Array.isArray(value)
    ? value.map(shape)
    : value && typeof value === 'object'
      ? Object.fromEntries(
          Object.entries(value).map(([key, nested]) => [key, shape(nested)])
        )
      : typeof value

describe('plant-products declaration copy', () => {
  it('keeps English and Welsh bundles structurally identical', () => {
    expect(shape(cy)).toEqual(shape(en))
  })

  it('pins the terminal action and validation copy', () => {
    expect(en.title).toBe('Declaration')
    expect(en.declarationLabel).toBe(
      'I/We have read and understood the Conditions, Data Protection Statement and Legal Declarations'
    )
    expect(en.submitButton).toBe('Submit notification')
    expect(en.errors.declarationRequired).toBe(
      'You must confirm that you have read and understood the Conditions, Data Protection Statement and Legal Declarations'
    )
  })

  it('pins every legal list and APHA address line', () => {
    expect(en.terms.items).toHaveLength(6)
    expect(en.legal.regulations).toHaveLength(4)
    expect(en.enquiries.aphaAddressLines).toHaveLength(7)
  })
})
