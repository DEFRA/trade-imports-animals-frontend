import { describe, it, expect } from 'vitest'
import { checkSave } from './index.js'
import { loadJourneyModel } from '../engine/index.js'

// Resolve committed catalogue ids by obligation name — the tests never
// hardcode UUIDs, so a reminted id cannot silently strand a fixture.
const { identifiers } = loadJourneyModel()

const slots = [
  {
    obligationId: identifiers.idOf('fullName'),
    name: 'fullName',
    type: 'text',
    inputName: 'fullName',
    mandate: 'hard'
  },
  {
    obligationId: identifiers.idOf('phone'),
    name: 'phone',
    type: 'tel',
    inputName: 'phone'
  },
  {
    obligationId: identifiers.idOf('dateOfBirth'),
    name: 'dateOfBirth',
    type: 'date',
    inputName: 'dateOfBirth'
  }
]

describe('validation/index — the composed checkSave gate', () => {
  it('blocks a blank fullName with a resolved GDS round trip', () => {
    const result = checkSave(slots, { fullName: '', phone: '' }, {})
    expect(result.blocked).toBe(true)
    expect(result.errors).toEqual({ fullName: 'Full name is required' })
    expect(result.errorSummary).toEqual([
      { text: 'Full name is required', href: '#fullName' }
    ])
  })

  it('passes when fullName is filled and every soft field is blank', () => {
    const result = checkSave(slots, { fullName: 'Amy Smith' }, {})
    expect(result).toEqual({
      blocked: false,
      findings: [],
      errors: {},
      errorSummary: []
    })
  })

  it('surfaces a filled format failure with date-part targeting', () => {
    const result = checkSave(
      slots,
      {
        fullName: 'Amy Smith',
        'dateOfBirth-day': '31',
        'dateOfBirth-month': '2',
        'dateOfBirth-year': '1985'
      },
      {}
    )
    expect(result.blocked).toBe(true)
    expect(result.errorSummary).toEqual([
      { text: 'Date of birth must be a real date', href: '#dateOfBirth-day' }
    ])
    expect(result.errors['dateOfBirth-day']).toBe(
      'Date of birth must be a real date'
    )
  })
})
