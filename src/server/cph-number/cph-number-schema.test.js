import { describe, expect, test } from 'vitest'
import { cphNumberSchema } from './cph-number-schema.js'

describe('cphNumberSchema', () => {
  describe('valid CPH numbers', () => {
    test('accepts a valid 9-digit number', () => {
      const { error } = cphNumberSchema.validate({ cphNumber: '123456789' })
      expect(error).toBeUndefined()
    })

    test('accepts a 9-digit number starting with a leading zero', () => {
      const { error } = cphNumberSchema.validate({ cphNumber: '012345678' })
      expect(error).toBeUndefined()
    })

    test('accepts cphNumber alongside a crumb field', () => {
      const { error } = cphNumberSchema.validate({
        cphNumber: '123456789',
        crumb: 'csrf-token-value'
      })
      expect(error).toBeUndefined()
    })

    test('allows crumb to be absent', () => {
      const { error } = cphNumberSchema.validate({ cphNumber: '987654321' })
      expect(error).toBeUndefined()
    })
  })

  describe('missing or empty cphNumber', () => {
    test('fails when cphNumber is missing', () => {
      const { error } = cphNumberSchema.validate({})
      expect(error).toBeDefined()
      expect(error.details[0].path).toEqual(['cphNumber'])
      expect(error.details[0].message).toBe('Enter a CPH number')
    })

    test('fails when cphNumber is an empty string', () => {
      const { error } = cphNumberSchema.validate({ cphNumber: '' })
      expect(error).toBeDefined()
      expect(error.details[0].path).toEqual(['cphNumber'])
      expect(error.details[0].message).toBe('Enter a CPH number')
    })
  })

  describe('wrong length', () => {
    test('fails when cphNumber has 8 digits', () => {
      const { error } = cphNumberSchema.validate({ cphNumber: '12345678' })
      expect(error).toBeDefined()
      expect(error.details[0].path).toEqual(['cphNumber'])
      expect(error.details[0].message).toBe(
        'CPH number must be exactly 9 digits'
      )
    })

    test('fails when cphNumber has 10 digits', () => {
      const { error } = cphNumberSchema.validate({ cphNumber: '1234567890' })
      expect(error).toBeDefined()
      expect(error.details[0].path).toEqual(['cphNumber'])
      expect(error.details[0].message).toBe(
        'CPH number must be exactly 9 digits'
      )
    })
  })

  describe('non-digit characters', () => {
    test('fails when cphNumber contains a letter', () => {
      const { error } = cphNumberSchema.validate({ cphNumber: '12345678a' })
      expect(error).toBeDefined()
      expect(error.details[0].path).toEqual(['cphNumber'])
      expect(error.details[0].message).toBe(
        'CPH number must only contain numbers'
      )
    })

    test('fails when cphNumber contains a special character', () => {
      const { error } = cphNumberSchema.validate({ cphNumber: '1234/6789' })
      expect(error).toBeDefined()
      expect(error.details[0].path).toEqual(['cphNumber'])
      expect(error.details[0].message).toBe(
        'CPH number must only contain numbers'
      )
    })

    test('fails when cphNumber contains spaces', () => {
      const { error } = cphNumberSchema.validate({ cphNumber: '1234 6789' })
      expect(error).toBeDefined()
      expect(error.details[0].path).toEqual(['cphNumber'])
      expect(error.details[0].message).toBe(
        'CPH number must only contain numbers'
      )
    })
  })
})
