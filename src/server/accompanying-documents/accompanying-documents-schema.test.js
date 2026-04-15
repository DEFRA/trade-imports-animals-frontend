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

    test('Should pass with an empty submission (all fields optional)', () => {
      const { error } = accompanyingDocumentsSchema.validate({})
      expect(error).toBeUndefined()
    })

    test('Should pass when documentType is empty string', () => {
      const { error } = accompanyingDocumentsSchema.validate({
        documentType: ''
      })
      expect(error).toBeUndefined()
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

  describe('invalid documentReference', () => {
    test('Should fail when documentReference contains special characters', () => {
      const { error } = accompanyingDocumentsSchema.validate({
        documentReference: 'REF@#$%!'
      })
      expect(error).toBeDefined()
      expect(error.details[0].message).toBe(
        'Document reference must only contain letters, numbers, spaces and hyphens'
      )
    })

    test('Should fail when documentReference exceeds 100 characters', () => {
      const { error } = accompanyingDocumentsSchema.validate({
        documentReference: 'A'.repeat(101)
      })
      expect(error).toBeDefined()
      expect(error.details[0].message).toBe(
        'Document reference must be 100 characters or less'
      )
    })

    test('Should pass when documentReference is exactly 100 characters', () => {
      const { error } = accompanyingDocumentsSchema.validate({
        documentReference: 'A'.repeat(100)
      })
      expect(error).toBeUndefined()
    })
  })

  describe('cross-field partial date validation (validatePartialDate)', () => {
    test('Should return error when only day is provided', () => {
      const error = validatePartialDate({ 'issueDate-day': 15 })
      expect(error).not.toBeNull()
      expect(error.details[0].message).toBe('Enter a complete date of issue')
      expect(error.details[0].path).toEqual(['issueDate-day'])
    })

    test('Should return error when day and month are provided but year is missing', () => {
      const error = validatePartialDate({
        'issueDate-day': 15,
        'issueDate-month': 6
      })
      expect(error).not.toBeNull()
      expect(error.details[0].message).toBe('Enter a complete date of issue')
    })

    test('Should return null when all three date parts are provided', () => {
      const error = validatePartialDate({
        'issueDate-day': 15,
        'issueDate-month': 6,
        'issueDate-year': 2024
      })
      expect(error).toBeNull()
    })

    test('Should return null when all date parts are empty (no date provided)', () => {
      const error = validatePartialDate({
        'issueDate-day': '',
        'issueDate-month': '',
        'issueDate-year': ''
      })
      expect(error).toBeNull()
    })
  })
})
