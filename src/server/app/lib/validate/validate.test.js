import { describe, expect, it } from 'vitest'

import {
  compose,
  dateParts,
  dateText,
  dateTextInRange,
  integerInRange,
  maxText,
  oneOf,
  postcode,
  requiredDateText,
  requiredDateTextInRange,
  requiredEmail,
  requiredExactDigits,
  requiredIntegerInRange,
  requiredMaxText,
  requiredOneOf,
  requiredText,
  requiredTime,
  ukPhone,
  validate,
  vehicleReg
} from './index.js'
import { validatorDefaults } from '../../shared/copy.en.js'

const run = (schema, payload) => validate(schema, payload)

const CATEGORY_ONE = 'categoryOne'
const CATEGORY_TWO = 'categoryTwo'
const SELECTOR_ALPHA = 'selectorAlpha'
const SELECTOR_BRAVO = 'selectorBravo'

const FULL_NAME_REQUIRED_MESSAGE = 'Enter your full name'
const REGISTRATION_REQUIRED_MESSAGE = 'Enter a registration number'
const REGISTRATION_LENGTH_MESSAGE =
  'Registration number must be exactly 9 digits'
const SELECTOR_REQUIRED_MESSAGE = 'Select an option'
const FLIP_FIELD_REQUIRED_MESSAGE = 'Enter the code'
const FLIP_FIELD_MAX_LENGTH_MESSAGE = 'Code must be 5 characters or less'
const COUNT_REQUIRED_MESSAGE = 'Enter the number of items'
const COUNT_WHOLE_NUMBER_MESSAGE = 'Enter a whole number greater than 0'
const NOT_A_DATE = 'not a date'
const BLOCKS_BLANK_WHITESPACE_AND_MISSING =
  'Should block blank, whitespace-only and missing values with the required message'

describe('#requiredText — the sole save-blocking primitive', () => {
  const schema = requiredText('fullName', FULL_NAME_REQUIRED_MESSAGE)

  it('Should pass a non-blank value', () => {
    expect(run(schema, { fullName: 'Alex Driver' }).errors).toBeNull()
  })

  it('Should block a missing value with the given message on the field', () => {
    expect(run(schema, {}).errors).toEqual({
      fullName: FULL_NAME_REQUIRED_MESSAGE
    })
  })

  it('Should block a whitespace-only value (trimmed to empty)', () => {
    expect(run(schema, { fullName: '   ' }).errors).toEqual({
      fullName: FULL_NAME_REQUIRED_MESSAGE
    })
  })
})

describe('#requiredExactDigits — save-blocking fixed-length digit string', () => {
  const schema = requiredExactDigits('registrationNumber', 9, {
    required: REGISTRATION_REQUIRED_MESSAGE,
    length: REGISTRATION_LENGTH_MESSAGE,
    digitsOnly: 'Registration number must only contain numbers'
  })

  it('Should pass a value of exactly the digit count', () => {
    expect(run(schema, { registrationNumber: '123456789' }).errors).toBeNull()
  })

  it('Should block blank and missing values with the required message', () => {
    expect(run(schema, { registrationNumber: '' }).errors).toEqual({
      registrationNumber: REGISTRATION_REQUIRED_MESSAGE
    })
    expect(run(schema, {}).errors).toEqual({
      registrationNumber: REGISTRATION_REQUIRED_MESSAGE
    })
  })

  it('Should reject too-short and too-long values with the length message', () => {
    expect(run(schema, { registrationNumber: '12345678' }).errors).toEqual({
      registrationNumber: REGISTRATION_LENGTH_MESSAGE
    })
    expect(run(schema, { registrationNumber: '1234567890' }).errors).toEqual({
      registrationNumber: REGISTRATION_LENGTH_MESSAGE
    })
  })

  it('Should reject non-digit characters with the digits-only message', () => {
    expect(run(schema, { registrationNumber: '12345678a' }).errors).toEqual({
      registrationNumber: 'Registration number must only contain numbers'
    })
  })
})

describe('optional validators save blank (the mandate split)', () => {
  it.each([
    ['postcode', postcode('postcode')],
    ['registration', vehicleReg('registration')],
    ['phone', ukPhone('phone')],
    ['year', integerInRange('year', { min: 1900, max: 2100 })],
    ['country', oneOf('country', ['england', 'wales'])],
    ['description', maxText('description', 200)]
  ])('Should pass %s when blank', (field, schema) => {
    expect(run(schema, { [field]: '' }).errors).toBeNull()
  })

  it('Should pass when the field is absent entirely', () => {
    expect(run(postcode('postcode'), {}).errors).toBeNull()
  })
})

describe('postcode / vehicleReg — format', () => {
  it('Should accept a valid postcode and reject a malformed one', () => {
    expect(
      run(postcode('postcode'), { postcode: 'SW1A 1AA' }).errors
    ).toBeNull()
    expect(run(postcode('postcode'), { postcode: 'NOPE' }).errors).toEqual({
      postcode: 'Enter a valid postcode'
    })
  })

  it('Should accept a valid registration and reject a malformed one', () => {
    expect(
      run(vehicleReg('registration'), { registration: 'AB12 CDE' }).errors
    ).toBeNull()
    expect(
      run(vehicleReg('registration'), { registration: '1' }).errors
    ).toEqual({ registration: 'Enter a valid registration number' })
  })
})

describe('#ukPhone — allow-list + digit count', () => {
  it('Should accept a real UK number', () => {
    expect(run(ukPhone('phone'), { phone: '07700 900123' }).errors).toBeNull()
  })

  it('Should reject letters and too-few-digit numbers', () => {
    expect(run(ukPhone('phone'), { phone: 'call me' }).errors).toHaveProperty(
      'phone'
    )
    expect(run(ukPhone('phone'), { phone: '12345' }).errors).toHaveProperty(
      'phone'
    )
  })
})

describe('#oneOf — value domain', () => {
  const schema = oneOf('itemCategory', [CATEGORY_ONE, CATEGORY_TWO])

  it('Should accept a value in the domain', () => {
    expect(run(schema, { itemCategory: CATEGORY_ONE }).errors).toBeNull()
  })

  it('Should reject a value outside the domain', () => {
    expect(run(schema, { itemCategory: 'categoryUnlisted' }).errors).toEqual({
      itemCategory: 'Select a valid option'
    })
  })
})

describe('#requiredOneOf — save-blocking value domain', () => {
  const schema = requiredOneOf(
    'itemSelector',
    [SELECTOR_ALPHA, SELECTOR_BRAVO],
    SELECTOR_REQUIRED_MESSAGE
  )

  it('Should accept a value in the domain', () => {
    expect(run(schema, { itemSelector: SELECTOR_ALPHA }).errors).toBeNull()
  })

  it('Should block blank and missing values — unlike composing requiredText with oneOf', () => {
    expect(run(schema, { itemSelector: '' }).errors).toEqual({
      itemSelector: SELECTOR_REQUIRED_MESSAGE
    })
    expect(run(schema, {}).errors).toEqual({
      itemSelector: SELECTOR_REQUIRED_MESSAGE
    })
  })

  it('Should reject a value outside the domain', () => {
    expect(run(schema, { itemSelector: 'gold-plated' }).errors).toEqual({
      itemSelector: SELECTOR_REQUIRED_MESSAGE
    })
  })

  it('Should reject every value when the domain is empty', () => {
    const noDomain = requiredOneOf(
      'itemSelector',
      [],
      SELECTOR_REQUIRED_MESSAGE
    )

    expect(run(noDomain, { itemSelector: SELECTOR_ALPHA }).errors).toEqual({
      itemSelector: SELECTOR_REQUIRED_MESSAGE
    })
    expect(run(noDomain, { itemSelector: '' }).errors).toEqual({
      itemSelector: SELECTOR_REQUIRED_MESSAGE
    })
  })
})

describe('#integerInRange — bounds', () => {
  const schema = integerInRange('year', { min: 1900, max: 2100 })

  it('Should accept an in-range whole number', () => {
    expect(run(schema, { year: '2018' }).errors).toBeNull()
  })

  it('Should reject out-of-range and non-numeric input', () => {
    expect(run(schema, { year: '1850' }).errors).toHaveProperty('year')
    expect(run(schema, { year: 'twenty' }).errors).toHaveProperty('year')
  })
})

describe('#requiredIntegerInRange — save-blocking whole number in a range', () => {
  const schema = requiredIntegerInRange('itemCount', {
    min: 1,
    messages: {
      required: COUNT_REQUIRED_MESSAGE,
      invalid: COUNT_WHOLE_NUMBER_MESSAGE
    }
  })

  it('Should accept an in-range whole number', () => {
    expect(run(schema, { itemCount: '25' }).errors).toBeNull()
  })

  it(BLOCKS_BLANK_WHITESPACE_AND_MISSING, () => {
    expect(run(schema, { itemCount: '' }).errors).toEqual({
      itemCount: COUNT_REQUIRED_MESSAGE
    })
    expect(run(schema, { itemCount: '   ' }).errors).toEqual({
      itemCount: COUNT_REQUIRED_MESSAGE
    })
    expect(run(schema, {}).errors).toEqual({
      itemCount: COUNT_REQUIRED_MESSAGE
    })
  })

  it('Should reject non-numeric and out-of-range values with the invalid message', () => {
    expect(run(schema, { itemCount: 'ten' }).errors).toEqual({
      itemCount: COUNT_WHOLE_NUMBER_MESSAGE
    })
    expect(run(schema, { itemCount: '0' }).errors).toEqual({
      itemCount: COUNT_WHOLE_NUMBER_MESSAGE
    })
  })

  it('Should fall back to the shared defaults when no invalid message is given', () => {
    const withoutInvalidMessage = requiredIntegerInRange('itemCount', {
      min: 1,
      max: 10,
      messages: { required: COUNT_REQUIRED_MESSAGE }
    })
    expect(run(withoutInvalidMessage, { itemCount: 'ten' }).errors).toEqual({
      itemCount: validatorDefaults.wholeNumber
    })
    expect(run(withoutInvalidMessage, { itemCount: '11' }).errors).toEqual({
      itemCount: validatorDefaults.numberBetween(1, 10)
    })
  })
})

describe('#maxText — length cap', () => {
  const schema = maxText('description', 10)

  it('Should accept text within the cap', () => {
    expect(run(schema, { description: 'short' }).errors).toBeNull()
  })

  it('Should reject text over the cap', () => {
    expect(
      run(schema, { description: 'far too long to allow' }).errors
    ).toHaveProperty('description')
  })
})

describe('#requiredMaxText — save-blocking text with a length cap', () => {
  const schema = requiredMaxText('statusFlipField', 5, {
    required: FLIP_FIELD_REQUIRED_MESSAGE,
    maxLength: FLIP_FIELD_MAX_LENGTH_MESSAGE
  })

  it('Should accept text within the cap', () => {
    expect(run(schema, { statusFlipField: 'FR-75' }).errors).toBeNull()
  })

  it('Should block blank, whitespace-only and missing values', () => {
    expect(run(schema, { statusFlipField: '' }).errors).toEqual({
      statusFlipField: FLIP_FIELD_REQUIRED_MESSAGE
    })
    expect(run(schema, { statusFlipField: '   ' }).errors).toEqual({
      statusFlipField: FLIP_FIELD_REQUIRED_MESSAGE
    })
    expect(run(schema, {}).errors).toEqual({
      statusFlipField: FLIP_FIELD_REQUIRED_MESSAGE
    })
  })

  it('Should reject text over the cap with the length message', () => {
    expect(run(schema, { statusFlipField: 'ABCDEF' }).errors).toEqual({
      statusFlipField: FLIP_FIELD_MAX_LENGTH_MESSAGE
    })
  })

  it('Should fall back to the shared length message when none is given', () => {
    const withoutLengthMessage = requiredMaxText('statusFlipField', 5, {
      required: FLIP_FIELD_REQUIRED_MESSAGE
    })

    expect(
      run(withoutLengthMessage, { statusFlipField: 'ABCDEF' }).errors
    ).toEqual({
      statusFlipField: validatorDefaults.maxLength(5)
    })
  })
})

describe('#requiredEmail — save-blocking email address with a length cap', () => {
  const EMAIL_REQUIRED_MESSAGE = 'Enter an email address'
  const EMAIL_FORMAT_MESSAGE = 'Enter an email address in the correct format'
  const EMAIL_MAX_LENGTH_MESSAGE =
    'Email address must be 20 characters or fewer'
  const EMAIL_MAX_LENGTH = 20
  const schema = requiredEmail('email', EMAIL_MAX_LENGTH, {
    required: EMAIL_REQUIRED_MESSAGE,
    maxLength: EMAIL_MAX_LENGTH_MESSAGE,
    format: EMAIL_FORMAT_MESSAGE
  })

  it('Should accept an address and hand back the trimmed value', () => {
    const { errors, value } = run(schema, { email: '  alex@example.com  ' })
    expect(errors).toBeNull()
    expect(value.email).toBe('alex@example.com')
  })

  it(BLOCKS_BLANK_WHITESPACE_AND_MISSING, () => {
    expect(run(schema, { email: '' }).errors).toEqual({
      email: EMAIL_REQUIRED_MESSAGE
    })
    expect(run(schema, { email: '   ' }).errors).toEqual({
      email: EMAIL_REQUIRED_MESSAGE
    })
    expect(run(schema, {}).errors).toEqual({ email: EMAIL_REQUIRED_MESSAGE })
  })

  it.each(['not-an-email', 'alex@', '@example.com', 'alex example.com'])(
    'Should reject %s with the format message',
    (value) => {
      expect(run(schema, { email: value }).errors).toEqual({
        email: EMAIL_FORMAT_MESSAGE
      })
    }
  )

  it('Should tell an over-long malformed value about its length, not its shape', () => {
    expect(
      run(schema, { email: 'A'.repeat(EMAIL_MAX_LENGTH + 1) }).errors
    ).toEqual({ email: EMAIL_MAX_LENGTH_MESSAGE })
  })

  it('Should fall back to the shared length message when none is given', () => {
    const withoutLengthMessage = requiredEmail('email', EMAIL_MAX_LENGTH, {
      required: EMAIL_REQUIRED_MESSAGE,
      format: EMAIL_FORMAT_MESSAGE
    })

    expect(
      run(withoutLengthMessage, { email: 'A'.repeat(EMAIL_MAX_LENGTH + 1) })
        .errors
    ).toEqual({ email: validatorDefaults.maxLength(EMAIL_MAX_LENGTH) })
  })
})

describe('#dateParts — day/month/year triple, anchored on the day box', () => {
  const schema = dateParts('dateOfBirth')

  it('Should pass when all three parts are blank (optional)', () => {
    expect(
      run(schema, {
        'dateOfBirth-day': '',
        'dateOfBirth-month': '',
        'dateOfBirth-year': ''
      }).errors
    ).toBeNull()
  })

  it('Should pass a real date', () => {
    expect(
      run(schema, {
        'dateOfBirth-day': '27',
        'dateOfBirth-month': '3',
        'dateOfBirth-year': '1985'
      }).errors
    ).toBeNull()
  })

  it('Should fail a partial date, anchored on the day part', () => {
    expect(
      run(schema, {
        'dateOfBirth-day': '27',
        'dateOfBirth-month': '',
        'dateOfBirth-year': ''
      }).errors
    ).toEqual({ 'dateOfBirth-day': 'Enter a valid date' })
  })

  it('Should fail an unreal date (31 February)', () => {
    expect(
      run(schema, {
        'dateOfBirth-day': '31',
        'dateOfBirth-month': '2',
        'dateOfBirth-year': '2000'
      }).errors
    ).toHaveProperty('dateOfBirth-day')
  })
})

describe('#dateText — optional dd/mm/yyyy input', () => {
  const schema = dateText('dateOfBirth')

  it('Should pass a blank value and real dates with one- or two-digit parts', () => {
    expect(run(schema, { dateOfBirth: '' }).errors).toBeNull()
    expect(run(schema, { dateOfBirth: '7/3/1985' }).errors).toBeNull()
    expect(run(schema, { dateOfBirth: '27/03/1985' }).errors).toBeNull()
  })

  it.each(['27/3', '31/2/2000', '2000-03-27', NOT_A_DATE])(
    'Should reject %s on the single input',
    (value) => {
      expect(run(schema, { dateOfBirth: value }).errors).toEqual({
        dateOfBirth: 'Enter a valid date'
      })
    }
  )
})

describe('#requiredDateText — save-blocking dd/mm/yyyy input', () => {
  const REQUIRED_MESSAGE = 'Enter an exit date'
  const INVALID_MESSAGE = 'Enter a real exit date'
  const schema = requiredDateText('exitDate', {
    required: REQUIRED_MESSAGE,
    invalid: INVALID_MESSAGE
  })

  it('Should accept real dates with one- or two-digit parts', () => {
    expect(run(schema, { exitDate: '7/3/1985' }).errors).toBeNull()
    expect(run(schema, { exitDate: '27/03/1985' }).errors).toBeNull()
  })

  it.each(['', '   '])(
    'Should ask for the date when the value is %j',
    (value) => {
      expect(run(schema, { exitDate: value }).errors).toEqual({
        exitDate: REQUIRED_MESSAGE
      })
    }
  )

  it('Should ask for the date when the field is absent altogether', () => {
    expect(run(schema, {}).errors).toEqual({ exitDate: REQUIRED_MESSAGE })
  })

  it.each(['27/3', '31/2/2000', '2000-03-27', NOT_A_DATE])(
    'Should reject %s as not a real date rather than as missing',
    (value) => {
      expect(run(schema, { exitDate: value }).errors).toEqual({
        exitDate: INVALID_MESSAGE
      })
    }
  )

  it('Should fall back to the shared date message when no invalid message is given', () => {
    const withoutInvalidMessage = requiredDateText('exitDate', {
      required: REQUIRED_MESSAGE
    })

    expect(run(withoutInvalidMessage, { exitDate: NOT_A_DATE }).errors).toEqual(
      { exitDate: validatorDefaults.date }
    )
  })
})

describe('#dateTextInRange — inclusive bounds on a dd/mm/yyyy input', () => {
  const INVALID_MESSAGE = 'Enter a real arrival date'
  const RANGE_MESSAGE = 'Arrival date must be between 1/3/2026 and 30/9/2026'
  const schema = dateTextInRange('arrivalDateAtPort', {
    min: new Date(Date.UTC(2026, 2, 1)),
    max: new Date(Date.UTC(2026, 8, 30)),
    invalidMessage: INVALID_MESSAGE,
    rangeMessage: RANGE_MESSAGE
  })

  it('Should pass a blank value, leaving the field optional', () => {
    expect(run(schema, { arrivalDateAtPort: '' }).errors).toBeNull()
  })

  it.each(['1/3/2026', '01/03/2026', '30/9/2026', '15/6/2026'])(
    'Should accept %s, inside or on the bounds',
    (value) => {
      expect(run(schema, { arrivalDateAtPort: value }).errors).toBeNull()
    }
  )

  it.each(['28/2/2026', '1/10/2026', '1/1/1900'])(
    'Should reject %s as out of range',
    (value) => {
      expect(run(schema, { arrivalDateAtPort: value }).errors).toEqual({
        arrivalDateAtPort: RANGE_MESSAGE
      })
    }
  )

  it.each(['31/2/2026', '27/3', '2026-03-27', NOT_A_DATE])(
    'Should reject %s as not a real date, not as out of range',
    (value) => {
      expect(run(schema, { arrivalDateAtPort: value }).errors).toEqual({
        arrivalDateAtPort: INVALID_MESSAGE
      })
    }
  )

  it('Should fall back to the invalid message when no range message is given', () => {
    const withoutRangeMessage = dateTextInRange('arrivalDateAtPort', {
      min: new Date(Date.UTC(2026, 2, 1)),
      max: new Date(Date.UTC(2026, 8, 30)),
      invalidMessage: INVALID_MESSAGE
    })

    expect(
      run(withoutRangeMessage, { arrivalDateAtPort: '1/1/1900' }).errors
    ).toEqual({ arrivalDateAtPort: INVALID_MESSAGE })
  })
})

describe('#requiredDateTextInRange — save-blocking date text in bounds', () => {
  const ARRIVAL_DATE_REQUIRED_MESSAGE = 'Enter the arrival date'
  const ARRIVAL_DATE_INVALID_MESSAGE = 'Enter a real arrival date'
  const ARRIVAL_DATE_RANGE_MESSAGE =
    'Arrival date must be between 1/3/2026 and 30/9/2026'
  const MIN = new Date(Date.UTC(2026, 2, 1))
  const MAX = new Date(Date.UTC(2026, 8, 30))
  const schema = requiredDateTextInRange('arrivalDate', {
    min: MIN,
    max: MAX,
    messages: {
      required: ARRIVAL_DATE_REQUIRED_MESSAGE,
      invalid: ARRIVAL_DATE_INVALID_MESSAGE,
      range: ARRIVAL_DATE_RANGE_MESSAGE
    }
  })

  it(BLOCKS_BLANK_WHITESPACE_AND_MISSING, () => {
    expect(run(schema, { arrivalDate: '' }).errors).toEqual({
      arrivalDate: ARRIVAL_DATE_REQUIRED_MESSAGE
    })
    expect(run(schema, { arrivalDate: '   ' }).errors).toEqual({
      arrivalDate: ARRIVAL_DATE_REQUIRED_MESSAGE
    })
    expect(run(schema, {}).errors).toEqual({
      arrivalDate: ARRIVAL_DATE_REQUIRED_MESSAGE
    })
  })

  it('Should pass a date inside the bounds and leave the text untouched', () => {
    const { errors, value } = run(schema, { arrivalDate: '15/6/2026' })
    expect(errors).toBeNull()
    expect(value.arrivalDate).toBe('15/6/2026')
  })

  it('Should reject a date after the max with the range message', () => {
    expect(run(schema, { arrivalDate: '1/10/2026' }).errors).toEqual({
      arrivalDate: ARRIVAL_DATE_RANGE_MESSAGE
    })
  })

  it('Should fall back to the invalid message when no range message is given', () => {
    const withoutRangeMessage = requiredDateTextInRange('arrivalDate', {
      min: MIN,
      max: MAX,
      messages: {
        required: ARRIVAL_DATE_REQUIRED_MESSAGE,
        invalid: ARRIVAL_DATE_INVALID_MESSAGE
      }
    })
    expect(
      run(withoutRangeMessage, { arrivalDate: '1/10/2026' }).errors
    ).toEqual({ arrivalDate: ARRIVAL_DATE_INVALID_MESSAGE })
  })

  it('Should fall back to the shared date default when neither message is given', () => {
    const withoutEitherMessage = requiredDateTextInRange('arrivalDate', {
      min: MIN,
      max: MAX,
      messages: { required: ARRIVAL_DATE_REQUIRED_MESSAGE }
    })
    expect(
      run(withoutEitherMessage, { arrivalDate: '1/10/2026' }).errors
    ).toEqual({ arrivalDate: validatorDefaults.date })
  })

  it('Should reject the day before the min and accept the bound itself', () => {
    expect(run(schema, { arrivalDate: '28/2/2026' }).errors).toEqual({
      arrivalDate: ARRIVAL_DATE_RANGE_MESSAGE
    })
    expect(run(schema, { arrivalDate: '1/3/2026' }).errors).toBeNull()
  })

  it.each(['31/2/2026', '5-8-2026', '27/3/26', NOT_A_DATE])(
    'Should reject %s as not a real date',
    (value) => {
      expect(run(schema, { arrivalDate: value }).errors).toEqual({
        arrivalDate: ARRIVAL_DATE_INVALID_MESSAGE
      })
    }
  )
})

describe('#requiredTime — save-blocking 24-hour time', () => {
  const ARRIVAL_TIME_REQUIRED_MESSAGE = 'Enter the arrival time'
  const ARRIVAL_TIME_INVALID_MESSAGE = 'Enter a real arrival time'
  const schema = requiredTime('arrivalTime', {
    required: ARRIVAL_TIME_REQUIRED_MESSAGE,
    invalid: ARRIVAL_TIME_INVALID_MESSAGE
  })

  it('Should block blank and missing values with the required message', () => {
    expect(run(schema, { arrivalTime: '' }).errors).toEqual({
      arrivalTime: ARRIVAL_TIME_REQUIRED_MESSAGE
    })
    expect(run(schema, {}).errors).toEqual({
      arrivalTime: ARRIVAL_TIME_REQUIRED_MESSAGE
    })
  })

  it.each(['14:30', '00:00', '23:59'])(
    'Should accept %s on the 24-hour clock',
    (value) => {
      expect(run(schema, { arrivalTime: value }).errors).toBeNull()
    }
  )

  it.each(['1430', '9:30', '24:00', '14:60', '2:5'])(
    'Should reject %s with the invalid message',
    (value) => {
      expect(run(schema, { arrivalTime: value }).errors).toEqual({
        arrivalTime: ARRIVAL_TIME_INVALID_MESSAGE
      })
    }
  )

  it('Should fall back to the shared time default when no invalid message is given', () => {
    const withoutInvalidMessage = requiredTime('arrivalTime', {
      required: ARRIVAL_TIME_REQUIRED_MESSAGE
    })
    expect(run(withoutInvalidMessage, { arrivalTime: '1430' }).errors).toEqual({
      arrivalTime: validatorDefaults.time
    })
  })
})

describe('#compose + the Joi → GDS mapping', () => {
  const schema = compose(
    requiredText('fullName', FULL_NAME_REQUIRED_MESSAGE),
    postcode('postcode')
  )

  it('Should let unknown keys (e.g. the CSRF crumb) pass through', () => {
    expect(
      run(schema, { fullName: 'Alex', postcode: 'SW1A 1AA', crumb: 'tok' })
        .errors
    ).toBeNull()
  })

  it('Should collect one message per failing field (abortEarly: false)', () => {
    const { errors } = run(schema, { fullName: '', postcode: 'NOPE' })
    expect(errors).toEqual({
      fullName: FULL_NAME_REQUIRED_MESSAGE,
      postcode: 'Enter a valid postcode'
    })
  })

  it('Should return null errors when everything is valid', () => {
    expect(run(schema, { fullName: 'Alex', postcode: '' }).errors).toBeNull()
  })
})
