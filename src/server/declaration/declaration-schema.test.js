import { describe, expect, test } from 'vitest'
import { declarationSchema } from './declaration-schema.js'

describe('declarationSchema', () => {
  describe('valid payloads', () => {
    test('accepts confirmed declaration', () => {
      const { error } = declarationSchema.validate({ declaration: 'confirmed' })
      expect(error).toBeUndefined()
    })

    test('accepts confirmed declaration with crumb', () => {
      const { error } = declarationSchema.validate({
        declaration: 'confirmed',
        crumb: 'csrf-token'
      })
      expect(error).toBeUndefined()
    })

    test('accepts optional crumb as empty string', () => {
      const { error } = declarationSchema.validate({
        declaration: 'confirmed',
        crumb: ''
      })
      expect(error).toBeUndefined()
    })

    test('accepts optional crumb as null', () => {
      const { error } = declarationSchema.validate({
        declaration: 'confirmed',
        crumb: null
      })
      expect(error).toBeUndefined()
    })
  })

  describe('declaration validation', () => {
    test('fails when declaration is absent', () => {
      const { error } = declarationSchema.validate({})
      expect(error).toBeDefined()
      expect(error.details[0].message).toBe(
        'Confirm that the information is true and correct before submitting'
      )
    })

    test('fails when declaration has an unexpected value', () => {
      const { error } = declarationSchema.validate({ declaration: 'yes' })
      expect(error).toBeDefined()
      expect(error.details[0].message).toBe(
        'Confirm that the information is true and correct before submitting'
      )
    })
  })
})
