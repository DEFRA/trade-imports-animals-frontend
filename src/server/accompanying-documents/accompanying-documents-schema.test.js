import {
  accompanyingDocumentsSchema,
  validatePartialDate
} from './accompanying-documents-schema.js'

describe('#accompanyingDocumentsSchema', () => {
  describe('valid payloads', () => {
    test('Should pass with a full valid payload', () => {
      const { error } = accompanyingDocumentsSchema.validate({
        documentType: 'ITAHC',
        documentReference: 'REF-123 ABC',
        'issueDate-day': 15,
        'issueDate-month': 6,
        'issueDate-year': 2024,
        crumb: 'some-crumb-token'
      })
      expect(error).toBeUndefined()
    })

    test('Should fail with an empty submission (documentType is required)', () => {
      const { error } = accompanyingDocumentsSchema.validate({})
      expect(error).toBeDefined()
      expect(error.details[0].message).toBe('Select a document type')
    })

    test('Should fail when documentType is empty string', () => {
      const { error } = accompanyingDocumentsSchema.validate({
        documentType: ''
      })
      expect(error).toBeDefined()
      expect(error.details[0].message).toBe('Select a document type')
    })

    test('Should pass for each valid document type', () => {
      const validTypes = ['ITAHC', 'VETERINARY_HEALTH_CERTIFICATE']
      for (const type of validTypes) {
        const { error } = accompanyingDocumentsSchema.validate({
          documentType: type
        })
        expect(error).toBeUndefined()
      }
    })
  })

  describe('invalid documentType', () => {
    test('Should fail with custom message when documentType is not in allowed list', () => {
      const { error } = accompanyingDocumentsSchema.validate({
        documentType: 'INVALID'
      })
      expect(error).toBeDefined()
      expect(error.details[0].message).toBe('Select a document type')
    })
  })

  describe('invalid date field values', () => {
    test('Should fail when issueDate-day is a non-numeric string', () => {
      const { error } = accompanyingDocumentsSchema.validate({
        documentType: 'ITAHC',
        'issueDate-day': 'abc'
      })
      expect(error).toBeDefined()
    })
  })

  describe('invalid documentReference', () => {
    test('Should fail when documentReference contains special characters', () => {
      const { error } = accompanyingDocumentsSchema.validate({
        documentType: 'ITAHC',
        documentReference: 'REF@#$%!'
      })
      expect(error).toBeDefined()
      expect(error.details[0].message).toBe(
        'Document reference must only contain letters, numbers, spaces and hyphens'
      )
    })

    test('Should fail when documentReference exceeds 100 characters', () => {
      const { error } = accompanyingDocumentsSchema.validate({
        documentType: 'ITAHC',
        documentReference: 'A'.repeat(101)
      })
      expect(error).toBeDefined()
      expect(error.details[0].message).toBe(
        'Document reference must be 100 characters or less'
      )
    })

    test('Should pass when documentReference is exactly 100 characters', () => {
      const { error } = accompanyingDocumentsSchema.validate({
        documentType: 'ITAHC',
        documentReference: 'A'.repeat(100)
      })
      expect(error).toBeUndefined()
    })
  })

  describe('cross-field partial date validation (validatePartialDate)', () => {
    test('Should return error for all three fields when date is completely absent (empty strings)', () => {
      const error = validatePartialDate({
        'issueDate-day': '',
        'issueDate-month': '',
        'issueDate-year': ''
      })
      expect(error).not.toBeNull()
      expect(error.details).toHaveLength(3)
      expect(error.details[0].message).toBe('Enter a date of issue')
      expect(error.details[0].path).toEqual(['issueDate-day'])
      expect(error.details[1].path).toEqual(['issueDate-month'])
      expect(error.details[2].path).toEqual(['issueDate-year'])
    })

    test('Should return error for all three fields when date is completely absent (undefined)', () => {
      const error = validatePartialDate({})
      expect(error).not.toBeNull()
      expect(error.details).toHaveLength(3)
      expect(error.details[0].message).toBe('Enter a date of issue')
    })

    test('Should return error only for missing fields when only day is provided', () => {
      const error = validatePartialDate({ 'issueDate-day': 15 })
      expect(error).not.toBeNull()
      expect(error.details).toHaveLength(2)
      expect(error.details[0].message).toBe(
        'Date of issue must include a month'
      )
      expect(error.details[0].path).toEqual(['issueDate-month'])
      expect(error.details[1].message).toBe('Date of issue must include a year')
      expect(error.details[1].path).toEqual(['issueDate-year'])
    })

    test('Should return error only for year when day and month are provided', () => {
      const error = validatePartialDate({
        'issueDate-day': 15,
        'issueDate-month': 6
      })
      expect(error).not.toBeNull()
      expect(error.details).toHaveLength(1)
      expect(error.details[0].message).toBe('Date of issue must include a year')
      expect(error.details[0].path).toEqual(['issueDate-year'])
    })

    test('Should return null when all three date parts are provided', () => {
      const error = validatePartialDate({
        'issueDate-day': 15,
        'issueDate-month': 6,
        'issueDate-year': 2024
      })
      expect(error).toBeNull()
    })

    test('Should return error for all three fields when date is not a real calendar date (31 Feb)', () => {
      const error = validatePartialDate({
        'issueDate-day': '31',
        'issueDate-month': '2',
        'issueDate-year': '2024'
      })
      expect(error).not.toBeNull()
      expect(error.details).toHaveLength(3)
      expect(error.details[0].message).toBe('Enter a real date of issue')
      expect(error.details[0].path).toEqual(['issueDate-day'])
      expect(error.details[1].path).toEqual(['issueDate-month'])
      expect(error.details[2].path).toEqual(['issueDate-year'])
    })

    test('Should return error for all three fields when day is out of range (32nd of a month)', () => {
      const error = validatePartialDate({
        'issueDate-day': '32',
        'issueDate-month': '1',
        'issueDate-year': '2024'
      })
      expect(error).not.toBeNull()
      expect(error.details).toHaveLength(3)
      expect(error.details[0].message).toBe('Enter a real date of issue')
      expect(error.details[0].path).toEqual(['issueDate-day'])
    })

    test('Should return null for a valid calendar date (29 Feb in a leap year)', () => {
      const error = validatePartialDate({
        'issueDate-day': '29',
        'issueDate-month': '2',
        'issueDate-year': '2024'
      })
      expect(error).toBeNull()
    })
  })
})
