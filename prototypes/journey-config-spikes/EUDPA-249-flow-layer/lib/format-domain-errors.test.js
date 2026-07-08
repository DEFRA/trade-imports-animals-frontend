import { describe, it, expect } from 'vitest'
import { formatDomainErrors, textFor, hrefFor } from './format-domain-errors.js'

describe('textFor', () => {
  it('produces max-length copy for string maxLength errors', () => {
    expect(
      textFor({
        code: 'domain.string.maxLength',
        obligation: 'internalReferenceNumber',
        max: 58,
        actual: 60
      })
    ).toBe('Enter no more than 58 characters (you entered 60)')
  })

  it('produces DD/MM/YYYY copy for date-format errors', () => {
    expect(
      textFor({
        code: 'domain.date.format',
        obligation: 'arrivalDateAtPort'
      })
    ).toBe('Enter a valid date in DD/MM/YYYY format')
  })

  it('produces max-selections copy for array cap errors', () => {
    expect(
      textFor({
        code: 'domain.array.maxSelections',
        obligation: 'transitedCountries',
        max: 12,
        actual: 13
      })
    ).toBe('Select no more than 12 items (you selected 13)')
  })

  it('falls back to a generic message for unknown codes', () => {
    expect(
      textFor({ code: 'domain.unknown.thing', obligation: 'x' })
    ).toContain('Invalid: domain.unknown.thing')
  })
})

describe('hrefFor', () => {
  it('anchors on the obligation name for top-level errors', () => {
    expect(hrefFor({ code: 'x', obligation: 'reasonForImport' })).toBe(
      '#reasonForImport'
    )
  })

  it('composes obligation-path for per-record errors', () => {
    expect(
      hrefFor({ code: 'x', obligation: 'numberOfAnimals', path: 'line1' })
    ).toBe('#numberOfAnimals-line1')
  })
})

describe('formatDomainErrors', () => {
  it('produces errorList + fieldErrors in the shape the GOV.UK macros want', () => {
    const errs = [
      {
        code: 'domain.string.maxLength',
        obligation: 'internalReferenceNumber',
        max: 58,
        actual: 60
      },
      { code: 'domain.date.format', obligation: 'arrivalDateAtPort' }
    ]
    const { errorList, fieldErrors } = formatDomainErrors(errs)
    expect(errorList).toEqual([
      {
        text: 'Enter no more than 58 characters (you entered 60)',
        href: '#internalReferenceNumber'
      },
      {
        text: 'Enter a valid date in DD/MM/YYYY format',
        href: '#arrivalDateAtPort'
      }
    ])
    expect(fieldErrors).toHaveProperty('internalReferenceNumber')
    expect(fieldErrors).toHaveProperty('arrivalDateAtPort')
  })

  it('keys per-record errors by "obligation-path"', () => {
    const errs = [
      {
        code: 'domain.integer.min',
        obligation: 'numberOfAnimals',
        path: 'line1',
        min: 1
      }
    ]
    const { fieldErrors } = formatDomainErrors(errs)
    expect(fieldErrors).toHaveProperty('numberOfAnimals-line1')
  })
})
