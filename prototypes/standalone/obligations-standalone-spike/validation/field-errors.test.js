import { describe, it, expect } from 'vitest'
import { toFieldErrors } from './field-errors.js'

describe('validation/field-errors — findings to GDS error view-models', () => {
  it('builds the errors map and summary with #inputName hrefs', () => {
    const { errors, errorSummary } = toFieldErrors([
      { inputName: 'fullName', code: 'mandate.fullName.missing' },
      { inputName: 'email', code: 'format.email.invalid' }
    ])
    expect(errors).toEqual({
      fullName: 'Full name is required',
      email: 'Enter a valid Email'
    })
    expect(errorSummary).toEqual([
      { text: 'Full name is required', href: '#fullName' },
      { text: 'Enter a valid Email', href: '#email' }
    ])
  })

  it('targets date parts via the focus suffix (#name-day)', () => {
    const { errors, errorSummary } = toFieldErrors([
      {
        inputName: 'dateOfBirth',
        code: 'format.dateOfBirth.notRealDate',
        focusSuffix: '-day'
      }
    ])
    expect(errors).toEqual({
      'dateOfBirth-day': 'Date of birth must be a real date'
    })
    expect(errorSummary).toEqual([
      { text: 'Date of birth must be a real date', href: '#dateOfBirth-day' }
    ])
  })

  it('keeps the first message per target (spike-a parity)', () => {
    const { errors, errorSummary } = toFieldErrors([
      { inputName: 'email', code: 'format.email.invalid' },
      { inputName: 'email', code: 'mandate.email.missing' }
    ])
    expect(errors).toEqual({ email: 'Enter a valid Email' })
    expect(errorSummary).toHaveLength(1)
  })

  it('interpolates finding values through the resolver', () => {
    const { errors } = toFieldErrors([
      {
        inputName: 'hadClaims',
        code: 'scope.answered',
        values: { answer: 'yes', field: 'Had claims' }
      }
    ])
    expect(errors.hadClaims).toBe('You answered "yes" for Had claims')
  })

  it('propagates resolver throws on unknown codes (graft 7)', () => {
    expect(() =>
      toFieldErrors([{ inputName: 'email', code: 'format.email.bogus' }])
    ).toThrow('Unknown message code "format.email.bogus"')
  })
})
