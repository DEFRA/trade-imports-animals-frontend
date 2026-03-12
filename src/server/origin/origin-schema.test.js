import { originSchema } from './origin-schema.js'

describe('originSchema', () => {
  describe('countryCode validation', () => {
    test('Should pass validation with valid country code', () => {
      const data = { countryCode: 'FR' }
      const { error } = originSchema.validate(data)

      expect(error).toBeUndefined()
    })

    test('Should fail validation when countryCode is missing', () => {
      const data = {}
      const { error } = originSchema.validate(data)

      expect(error).toBeDefined()
      expect(error.details[0].path).toEqual(['countryCode'])
      expect(error.details[0].message).toBe(
        'Select the country where the animal originates from'
      )
    })

    test('Should fail validation when countryCode is empty string', () => {
      const data = { countryCode: '' }
      const { error } = originSchema.validate(data)

      expect(error).toBeDefined()
      expect(error.details[0].path).toEqual(['countryCode'])
      expect(error.details[0].message).toBe(
        'Select the country where the animal originates from'
      )
    })

    test('Should fail validation when countryCode is null', () => {
      const data = { countryCode: null }
      const { error } = originSchema.validate(data)

      expect(error).toBeDefined()
      expect(error.details[0].path).toEqual(['countryCode'])
    })
  })

  describe('requiresOriginCode validation', () => {
    test('Should pass validation with requiresOriginCode present', () => {
      const data = {
        countryCode: 'FR',
        requiresRegionCode: 'yes'
      }
      const { error } = originSchema.validate(data)

      expect(error).toBeUndefined()
    })

    test('Should pass validation without requiresOriginCode (optional)', () => {
      const data = { countryCode: 'FR' }
      const { error } = originSchema.validate(data)

      expect(error).toBeUndefined()
    })

    test('Should pass validation with requiresOriginCode as empty string', () => {
      const data = {
        countryCode: 'FR',
        requiresRegionCode: ''
      }
      const { error } = originSchema.validate(data)

      expect(error).toBeUndefined()
    })

    test('Should accept "yes" value', () => {
      const data = {
        countryCode: 'FR',
        requiresRegionCode: 'yes'
      }
      const { error } = originSchema.validate(data)

      expect(error).toBeUndefined()
    })

    test('Should accept "no" value', () => {
      const data = {
        countryCode: 'FR',
        requiresRegionCode: 'no'
      }
      const { error } = originSchema.validate(data)

      expect(error).toBeUndefined()
    })
  })

  describe('referenceNumber validation', () => {
    test('Should pass validation with referenceNumber present', () => {
      const data = {
        countryCode: 'FR',
        referenceNumber: 'REF-12345'
      }
      const { error } = originSchema.validate(data)

      expect(error).toBeUndefined()
    })

    test('Should pass validation without referenceNumber (optional)', () => {
      const data = { countryCode: 'FR' }
      const { error } = originSchema.validate(data)

      expect(error).toBeUndefined()
    })

    test('Should pass validation with empty string referenceNumber', () => {
      const data = {
        countryCode: 'FR',
        referenceNumber: ''
      }
      const { error } = originSchema.validate(data)

      expect(error).toBeUndefined()
    })

    test('Should pass validation with null referenceNumber', () => {
      const data = {
        countryCode: 'FR',
        referenceNumber: null
      }
      const { error } = originSchema.validate(data)

      expect(error).toBeUndefined()
    })

    test('Should accept alphanumeric referenceNumber', () => {
      const data = {
        countryCode: 'FR',
        referenceNumber: 'ABC123-XYZ-789'
      }
      const { error } = originSchema.validate(data)

      expect(error).toBeUndefined()
    })
  })

  describe('internalReference validation', () => {
    test('Should pass validation with internalReference present', () => {
      const data = {
        countryCode: 'FR',
        internalReference: 'REF-12345'
      }
      const { error } = originSchema.validate(data)

      expect(error).toBeUndefined()
    })

    test('Should pass validation without internalReference (optional)', () => {
      const data = { countryCode: 'FR' }
      const { error } = originSchema.validate(data)

      expect(error).toBeUndefined()
    })

    test('Should pass validation with empty string internalReference', () => {
      const data = {
        countryCode: 'FR',
        internalReference: ''
      }
      const { error } = originSchema.validate(data)

      expect(error).toBeUndefined()
    })

    test('Should pass validation with null internalReference', () => {
      const data = {
        countryCode: 'FR',
        internalReference: null
      }
      const { error } = originSchema.validate(data)

      expect(error).toBeUndefined()
    })

    test('Should accept alphanumeric internalReference', () => {
      const data = {
        countryCode: 'FR',
        internalReference: 'ABC123-XYZ-789'
      }
      const { error } = originSchema.validate(data)

      expect(error).toBeUndefined()
    })
  })

  describe('crumb field validation', () => {
    test('Should pass validation with crumb field (CSRF token)', () => {
      const data = {
        countryCode: 'FR',
        crumb: 'csrf-token-value'
      }
      const { error } = originSchema.validate(data)

      expect(error).toBeUndefined()
    })

    test('Should pass validation without crumb field (optional)', () => {
      const data = { countryCode: 'FR' }
      const { error } = originSchema.validate(data)

      expect(error).toBeUndefined()
    })
  })

  describe('Complete form validation', () => {
    test('Should pass validation with all fields populated', () => {
      const data = {
        countryCode: 'DE',
        referenceNumber: 'REF-98765',
        requiresRegionCode: 'yes',
        internalReference: 'TEST-REF-001',
        crumb: 'csrf-token'
      }
      const { error } = originSchema.validate(data)

      expect(error).toBeUndefined()
    })

    test('Should pass validation with only required fields', () => {
      const data = { countryCode: 'IT' }
      const { error } = originSchema.validate(data)

      expect(error).toBeUndefined()
    })

    test('Should strip unknown fields when stripUnknown is enabled', () => {
      const data = {
        countryCode: 'FR',
        unknownField: 'should be stripped'
      }
      const { error, value } = originSchema.validate(data, {
        stripUnknown: true
      })

      expect(error).toBeUndefined()
      expect(value.unknownField).toBeUndefined()
      expect(value.countryCode).toBe('FR')
    })
  })

  describe('Error message customization', () => {
    test('Should return custom error message for missing countryCode', () => {
      const data = {}
      const { error } = originSchema.validate(data)

      expect(error.details[0].message).toBe(
        'Select the country where the animal originates from'
      )
    })

    test('Should return custom error message for empty countryCode', () => {
      const data = { countryCode: '' }
      const { error } = originSchema.validate(data)

      expect(error.details[0].message).toBe(
        'Select the country where the animal originates from'
      )
    })
  })
})
