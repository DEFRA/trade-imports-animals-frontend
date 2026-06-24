import {
  validatePayload,
  dobSchema,
  vehicleYearSchema,
  integerYearsSchema,
  phoneSchema,
  MIN_DRIVING_AGE,
  MAX_AGE
} from './validate.js'

const currentYear = new Date().getFullYear()

const dob = dobSchema('dateOfBirth', 'Date of birth')

function yearsAgoDob(years, { months = 0 } = {}) {
  const date = new Date()
  date.setFullYear(date.getFullYear() - years)
  date.setMonth(date.getMonth() - months)
  return {
    'dateOfBirth-day': String(date.getDate()),
    'dateOfBirth-month': String(date.getMonth() + 1),
    'dateOfBirth-year': String(date.getFullYear())
  }
}

describe('validatePayload', () => {
  test('with no schema returns the payload untouched and no errors', () => {
    const payload = { foo: '1' }
    const result = validatePayload(undefined, payload)
    expect(result.value).toBe(payload)
    expect(result.errors).toBeNull()
    expect(result.errorSummary).toBeNull()
  })

  test('on success coerces strings to numbers per the schema', () => {
    const schema = integerYearsSchema({
      name: 'yearsNoClaims',
      enterMessage: 'Enter how many years',
      noun: 'Years',
      min: 0,
      max: 99
    })
    const { value, errors } = validatePayload(schema, {
      yearsNoClaims: '5',
      crumb: 'tok'
    })
    expect(errors).toBeNull()
    expect(value.yearsNoClaims).toBe(5)
    expect(value.crumb).toBe('tok')
  })

  test('on failure returns errors keyed by field plus an errorSummary list', () => {
    const { errors, errorSummary } = validatePayload(dob, yearsAgoDob(30))
    // happy path — should be null
    expect(errors).toBeNull()
    expect(errorSummary).toBeNull()
  })

  test('aggregates per-part errors when the user submits an empty form', () => {
    const { errors, errorSummary } = validatePayload(dob, {})
    expect(errors).toMatchObject({
      'dateOfBirth-day': 'Date of birth must include a day',
      'dateOfBirth-month': 'Date of birth must include a month',
      'dateOfBirth-year': 'Date of birth must include a year'
    })
    expect(errorSummary).toEqual([
      { text: 'Date of birth must include a day', href: '#dateOfBirth-day' },
      {
        text: 'Date of birth must include a month',
        href: '#dateOfBirth-month'
      },
      { text: 'Date of birth must include a year', href: '#dateOfBirth-year' }
    ])
  })
})

describe('dobSchema', () => {
  test('passes for a plausible adult DOB and coerces parts to numbers', () => {
    const { value, errors } = validatePayload(dob, yearsAgoDob(30))
    expect(errors).toBeNull()
    expect(typeof value['dateOfBirth-day']).toBe('number')
    expect(typeof value['dateOfBirth-month']).toBe('number')
    expect(typeof value['dateOfBirth-year']).toBe('number')
  })

  test('rejects an out-of-range day with the per-part range message', () => {
    const { errors } = validatePayload(dob, {
      'dateOfBirth-day': '32',
      'dateOfBirth-month': '3',
      'dateOfBirth-year': '1990'
    })
    expect(errors['dateOfBirth-day']).toBe(
      'Day must be a number between 1 and 31'
    )
  })

  test('rejects an out-of-range month', () => {
    const { errors } = validatePayload(dob, {
      'dateOfBirth-day': '1',
      'dateOfBirth-month': '13',
      'dateOfBirth-year': '1990'
    })
    expect(errors['dateOfBirth-month']).toBe(
      'Month must be a number between 1 and 12'
    )
  })

  test('rejects an impossible calendar date (31 Feb)', () => {
    const { errors } = validatePayload(dob, {
      'dateOfBirth-day': '31',
      'dateOfBirth-month': '2',
      'dateOfBirth-year': '1990'
    })
    expect(errors['dateOfBirth-day']).toBe('Date of birth must be a real date')
  })

  test('rejects a future DOB', () => {
    const future = new Date()
    future.setFullYear(future.getFullYear() + 1)
    const { errors } = validatePayload(dob, {
      'dateOfBirth-day': String(future.getDate()),
      'dateOfBirth-month': String(future.getMonth() + 1),
      'dateOfBirth-year': String(future.getFullYear())
    })
    expect(errors['dateOfBirth-day']).toBe('Date of birth must be in the past')
  })

  test(`rejects an age below ${MIN_DRIVING_AGE}`, () => {
    const { errors } = validatePayload(
      dob,
      yearsAgoDob(MIN_DRIVING_AGE - 1, { months: 0 })
    )
    expect(errors['dateOfBirth-day']).toBe(
      `You must be at least ${MIN_DRIVING_AGE} years old`
    )
  })

  test(`rejects an age above ${MAX_AGE}`, () => {
    const { errors } = validatePayload(dob, yearsAgoDob(MAX_AGE + 1))
    expect(errors['dateOfBirth-day']).toBe(
      `Enter a date of birth less than ${MAX_AGE} years ago`
    )
  })

  test('non-numeric day is reported as a missing day, not as a real-date error', () => {
    const { errors } = validatePayload(dob, {
      'dateOfBirth-day': 'abc',
      'dateOfBirth-month': '3',
      'dateOfBirth-year': '1990'
    })
    expect(errors['dateOfBirth-day']).toBe('Date of birth must include a day')
  })
})

describe('vehicleYearSchema', () => {
  const schema = vehicleYearSchema({
    name: 'year',
    enterMessage: 'Enter the year your vehicle was made',
    noun: 'Year of manufacture'
  })

  test('passes for a 2018 vehicle and coerces to a number', () => {
    const { value, errors } = validatePayload(schema, { year: '2018' })
    expect(errors).toBeNull()
    expect(value.year).toBe(2018)
  })

  test('rejects an empty year with the friendly enter message', () => {
    const { errors } = validatePayload(schema, {})
    expect(errors.year).toBe('Enter the year your vehicle was made')
  })

  test('rejects non-numeric input', () => {
    const { errors } = validatePayload(schema, { year: 'abc' })
    expect(errors.year).toBe('Year of manufacture must be a number')
  })

  test('rejects a decimal year', () => {
    const { errors } = validatePayload(schema, { year: '2018.5' })
    expect(errors.year).toBe('Year of manufacture must be a whole number')
  })

  test('rejects years before 1900', () => {
    const { errors } = validatePayload(schema, { year: '1899' })
    expect(errors.year).toBe(
      `Year of manufacture must be between 1900 and ${currentYear + 1}`
    )
  })

  test('rejects years after currentYear + 1', () => {
    const { errors } = validatePayload(schema, {
      year: String(currentYear + 2)
    })
    expect(errors.year).toBe(
      `Year of manufacture must be between 1900 and ${currentYear + 1}`
    )
  })
})

describe('integerYearsSchema', () => {
  const schema = integerYearsSchema({
    name: 'yearsNoClaims',
    enterMessage: 'Enter how many years of no-claims discount you have',
    noun: 'Years of no-claims discount',
    min: 0,
    max: 99
  })

  test('passes for 0 and coerces to a number', () => {
    const { value, errors } = validatePayload(schema, { yearsNoClaims: '0' })
    expect(errors).toBeNull()
    expect(value.yearsNoClaims).toBe(0)
  })

  test('rejects an empty submission with the enter message', () => {
    const { errors } = validatePayload(schema, {})
    expect(errors.yearsNoClaims).toBe(
      'Enter how many years of no-claims discount you have'
    )
  })

  test('rejects a negative value', () => {
    const { errors } = validatePayload(schema, { yearsNoClaims: '-1' })
    expect(errors.yearsNoClaims).toBe(
      'Years of no-claims discount must be a whole number between 0 and 99'
    )
  })

  test('rejects a value above the max', () => {
    const { errors } = validatePayload(schema, { yearsNoClaims: '100' })
    expect(errors.yearsNoClaims).toBe(
      'Years of no-claims discount must be a whole number between 0 and 99'
    )
  })

  test('rejects a decimal value', () => {
    const { errors } = validatePayload(schema, { yearsNoClaims: '1.5' })
    expect(errors.yearsNoClaims).toBe(
      'Years of no-claims discount must be a whole number between 0 and 99'
    )
  })
})

describe('phoneSchema (required)', () => {
  const enterMessage = 'Enter a UK telephone number'
  const formatMessage =
    'Enter a telephone number, like 01632 960 001, 07700 900 982 or +44 808 157 0192'
  const schema = phoneSchema({ name: 'phone', enterMessage, formatMessage })

  test.each([
    ['UK landline with spaces', '01632 960 001'],
    ['UK landline grouped', '020 7946 0958'],
    ['UK mobile', '07700 900 982'],
    ['international with country code', '+44 808 157 0192'],
    ['compact international', '+15551234567'],
    ['extension separated by ext', '020 7946 0958 ext 123'],
    ['extension separated by x', '020 7946 0958 x123'],
    ['parentheses around area code', '(0118) 496 0123'],
    ['hyphen-separated', '555-123-4567'],
    ['surrounded by whitespace', '  07700 900 982  ']
  ])('accepts a valid %s', (_, input) => {
    const { value, errors } = validatePayload(schema, { phone: input })
    expect(errors).toBeNull()
    expect(value.phone).toBe(input.trim())
  })

  test('rejects an empty submission with the enter message', () => {
    const { errors } = validatePayload(schema, { phone: '' })
    expect(errors.phone).toBe(enterMessage)
  })

  test('rejects a missing field with the enter message', () => {
    const { errors } = validatePayload(schema, {})
    expect(errors.phone).toBe(enterMessage)
  })

  test('rejects letters outside the extension allow-list', () => {
    const { errors } = validatePayload(schema, { phone: 'call me maybe' })
    expect(errors.phone).toBe(formatMessage)
  })

  test('rejects too few digits', () => {
    const { errors } = validatePayload(schema, { phone: '12345' })
    expect(errors.phone).toBe(formatMessage)
  })

  test('rejects too many digits (E.164 cap is 15)', () => {
    const { errors } = validatePayload(schema, { phone: '1234567890123456' })
    expect(errors.phone).toBe(formatMessage)
  })

  test('rejects punctuation-only input with no digits', () => {
    const { errors } = validatePayload(schema, { phone: '()-+ ext' })
    expect(errors.phone).toBe(formatMessage)
  })
})

describe('phoneSchema (optional)', () => {
  const schema = phoneSchema({
    name: 'phone',
    enterMessage: 'never used',
    formatMessage: 'wrong format',
    required: false
  })

  test('accepts an empty string when not required', () => {
    const { value, errors } = validatePayload(schema, { phone: '' })
    expect(errors).toBeNull()
    expect(value.phone).toBe('')
  })

  test('still rejects garbage characters when not required', () => {
    const { errors } = validatePayload(schema, { phone: 'abc' })
    expect(errors.phone).toBe('wrong format')
  })
})

describe('phoneSchema composes with dobSchema via .concat()', () => {
  const combined = dobSchema('dateOfBirth', 'Date of birth').concat(
    phoneSchema({
      name: 'phone',
      enterMessage: 'Enter a UK telephone number',
      formatMessage: 'wrong format'
    })
  )

  test('reports both DOB and phone errors in one pass', () => {
    const { errors, errorSummary } = validatePayload(combined, {})
    expect(errors).toMatchObject({
      'dateOfBirth-day': 'Date of birth must include a day',
      'dateOfBirth-month': 'Date of birth must include a month',
      'dateOfBirth-year': 'Date of birth must include a year',
      phone: 'Enter a UK telephone number'
    })
    expect(errorSummary.map((row) => row.href)).toEqual([
      '#dateOfBirth-day',
      '#dateOfBirth-month',
      '#dateOfBirth-year',
      '#phone'
    ])
  })

  test('passes a fully valid About-you submission', () => {
    const { errors } = validatePayload(combined, {
      ...yearsAgoDob(30),
      phone: '07700 900 982'
    })
    expect(errors).toBeNull()
  })
})
