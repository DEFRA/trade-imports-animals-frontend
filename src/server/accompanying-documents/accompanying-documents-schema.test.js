import {
  accompanyingDocumentsSchema,
  MAX_DOCUMENT_REFERENCE_LENGTH
} from './accompanying-documents-schema.js'

describe('#accompanyingDocumentsSchema', () => {
  describe('valid payloads', () => {
    test('Should pass with a full valid payload', () => {
      const { error } = accompanyingDocumentsSchema.validate({
        documentType: 'ITAHC',
        documentReference: 'REF123ABC',
        'issueDate-day': 15,
        'issueDate-month': 6,
        'issueDate-year': 2024,
        crumb: 'some-crumb-token'
      })
      expect(error).toBeUndefined()
    })

    test('Should pass for each valid document type', () => {
      const validTypes = ['ITAHC', 'VETERINARY_HEALTH_CERTIFICATE']
      validTypes.forEach((type) => {
        const { error } = accompanyingDocumentsSchema.validate({
          documentType: type
        })
        expect(error).toBeUndefined()
      })
    })
  })

  describe('invalid documentType', () => {
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
      expect(error.details[0].message).toBe(
        '"issueDate-day" with value "abc" fails to match the required pattern: /^0*[1-9]\\d*$/'
      )
      expect(error.details[0].path).toContain('issueDate-day')
    })

    test('Should fail when issueDate-month is out of range (13)', () => {
      const { error } = accompanyingDocumentsSchema.validate({
        documentType: 'ITAHC',
        'issueDate-month': 13
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
        'Document reference must only contain letters and numbers'
      )
    })

    test('Should fail when documentReference exceeds 100 characters', () => {
      const { error } = accompanyingDocumentsSchema.validate({
        documentType: 'ITAHC',
        documentReference: 'A'.repeat(MAX_DOCUMENT_REFERENCE_LENGTH + 1)
      })
      expect(error).toBeDefined()
      expect(error.details[0].message).toBe(
        `Document reference must be ${MAX_DOCUMENT_REFERENCE_LENGTH} characters or less`
      )
    })

    test('Should pass when documentReference is exactly 100 characters', () => {
      const { error } = accompanyingDocumentsSchema.validate({
        documentType: 'ITAHC',
        documentReference: 'A'.repeat(MAX_DOCUMENT_REFERENCE_LENGTH)
      })
      expect(error).toBeUndefined()
    })
  })
})
