import { buildOperatorSchema } from './operator-schema.js'

const mdmCountryNames = ['United Kingdom', 'France', 'Germany']

const validOperator = {
  operatorType: 'CONSIGNOR',
  name: 'Acme',
  addressLine1: '1 High Street',
  addressLine2: 'Unit 4',
  city: 'Leeds',
  county: 'West Yorkshire',
  postcode: 'LS1 1AA',
  country: 'United Kingdom',
  telephone: '01234567890',
  email: 'acme@example.com'
}

function validate(payload, countries = mdmCountryNames) {
  return buildOperatorSchema(countries).validate(payload, {
    abortEarly: false
  })
}

function messagesFor(payload, field) {
  const { error } = validate(payload)
  return error.details
    .filter((d) => d.path.join('-') === field)
    .map((d) => d.message)
}

describe('#buildOperatorSchema', () => {
  test('accepts a fully valid operator', () => {
    const { error } = validate(validOperator)
    expect(error).toBeUndefined()
  })

  describe('reference-data outage stance (never build from an empty list)', () => {
    test('throws when the country membership list is empty', () => {
      expect(() => buildOperatorSchema([])).toThrow()
    })

    test('throws when the country membership list is missing', () => {
      expect(() => buildOperatorSchema(undefined)).toThrow()
    })
  })

  describe('mandatory fields', () => {
    test.each([
      ['operatorType', 'Select an operator type'],
      ['name', 'Enter a name'],
      ['addressLine1', 'Enter address line 1'],
      ['city', 'Enter a town or city'],
      ['postcode', 'Enter a postcode'],
      ['country', 'Select a country'],
      ['telephone', 'Enter a telephone number'],
      ['email', 'Enter an email address']
    ])('a missing %s produces its message', (field, message) => {
      const payload = { ...validOperator }
      delete payload[field]
      expect(messagesFor(payload, field)).toContain(message)
    })
  })

  describe('max-length rules', () => {
    test.each([
      ['name', 256, 'Name must be 255 characters or less'],
      ['addressLine1', 256, 'Address line 1 must be 255 characters or less'],
      ['addressLine2', 256, 'Address line 2 must be 255 characters or less'],
      ['city', 101, 'Town or city must be 100 characters or less'],
      ['county', 101, 'County must be 100 characters or less'],
      ['postcode', 13, 'Postcode must be 12 characters or less'],
      ['telephone', 21, 'Telephone number must be 20 characters or less']
    ])('%s over %i characters produces its message', (field, len, message) => {
      const payload = { ...validOperator, [field]: 'a'.repeat(len) }
      expect(messagesFor(payload, field)).toContain(message)
    })

    test('an email over 254 characters produces its message', () => {
      const local = 'a'.repeat(250)
      const payload = { ...validOperator, email: `${local}@ex.com` }
      expect(messagesFor(payload, 'email')).toContain(
        'Email address must be 254 characters or less'
      )
    })
  })

  test('a malformed email produces the format message', () => {
    const payload = { ...validOperator, email: 'not-an-email' }
    expect(messagesFor(payload, 'email')).toContain(
      'Enter an email address in the correct format, like name@example.com'
    )
  })

  describe('country MDM membership (c-009)', () => {
    test('rejects a country outside the MDM list', () => {
      const payload = { ...validOperator, country: 'Atlantis' }
      expect(messagesFor(payload, 'country')).toContain('Select a country')
    })

    test('accepts a country inside the MDM list', () => {
      const { error } = validate({ ...validOperator, country: 'France' })
      expect(error).toBeUndefined()
    })
  })

  describe('conditional transporter fields (c-019, mirrors @ValidTransporterFields)', () => {
    test('accepts approval number and category when the type is TRANSPORTER', () => {
      const { error } = validate({
        ...validOperator,
        operatorType: 'TRANSPORTER',
        approvalNumber: 'AP-1',
        transporterCategory: 'COMMERCIAL'
      })
      expect(error).toBeUndefined()
    })

    test('accepts a TRANSPORTER without the optional extras', () => {
      const { error } = validate({
        ...validOperator,
        operatorType: 'TRANSPORTER'
      })
      expect(error).toBeUndefined()
    })

    test('rejects approval number on a non-TRANSPORTER type', () => {
      const messages = messagesFor(
        { ...validOperator, approvalNumber: 'AP-1' },
        'approvalNumber'
      )
      expect(messages).toContain(
        'Approval number is only allowed for transporter operators'
      )
    })

    test('rejects transporter category on a non-TRANSPORTER type', () => {
      const messages = messagesFor(
        { ...validOperator, transporterCategory: 'PRIVATE' },
        'transporterCategory'
      )
      expect(messages).toContain(
        'Transporter category is only allowed for transporter operators'
      )
    })
  })

  test('collects every error (abortEarly false) rather than stopping at the first', () => {
    const { error } = validate({ operatorType: 'CONSIGNOR' })
    expect(error.details.length).toBeGreaterThan(1)
  })
})
