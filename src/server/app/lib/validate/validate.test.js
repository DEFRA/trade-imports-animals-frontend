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
  requiredExactDigits,
  requiredIntegerInRange,
  requiredMaxText,
  requiredOneOf,
  requiredText,
  ukPhone,
  validate,
  vehicleReg
} from './index.js'
import { validatorDefaults } from '../../shared/copy.en.js'

const run = (schema, payload) => validate(schema, payload)

const FULL_NAME_REQUIRED_MESSAGE = 'Enter your full name'
const CPH_REQUIRED_MESSAGE = 'Enter a CPH number'
const CPH_LENGTH_MESSAGE = 'CPH number must be exactly 9 digits'
const COMMODITY_REQUIRED_MESSAGE = 'Select a commodity'
const REGION_CODE_REQUIRED_MESSAGE = 'Enter the region of origin code'
const REGION_CODE_MAX_LENGTH_MESSAGE =
  'Region of origin code must be 5 characters or less'
const ANIMALS_REQUIRED_MESSAGE = 'Enter the number of animals'
const ANIMALS_WHOLE_NUMBER_MESSAGE = 'Enter a whole number greater than 0'

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
  const schema = requiredExactDigits('cph', 9, {
    required: CPH_REQUIRED_MESSAGE,
    length: CPH_LENGTH_MESSAGE,
    digitsOnly: 'CPH number must only contain numbers'
  })

  it('Should pass a value of exactly the digit count', () => {
    expect(run(schema, { cph: '123456789' }).errors).toBeNull()
  })

  it('Should block blank and missing values with the required message', () => {
    expect(run(schema, { cph: '' }).errors).toEqual({
      cph: CPH_REQUIRED_MESSAGE
    })
    expect(run(schema, {}).errors).toEqual({
      cph: CPH_REQUIRED_MESSAGE
    })
  })

  it('Should reject too-short and too-long values with the length message', () => {
    expect(run(schema, { cph: '12345678' }).errors).toEqual({
      cph: CPH_LENGTH_MESSAGE
    })
    expect(run(schema, { cph: '1234567890' }).errors).toEqual({
      cph: CPH_LENGTH_MESSAGE
    })
  })

  it('Should reject non-digit characters with the digits-only message', () => {
    expect(run(schema, { cph: '12345678a' }).errors).toEqual({
      cph: 'CPH number must only contain numbers'
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
  const schema = oneOf('typeSelection', ['Domestic', 'wild'])

  it('Should accept a value in the domain', () => {
    expect(run(schema, { typeSelection: 'Domestic' }).errors).toBeNull()
  })

  it('Should reject a value outside the domain', () => {
    expect(run(schema, { typeSelection: 'mythical' }).errors).toEqual({
      typeSelection: 'Select a valid option'
    })
  })
})

describe('#requiredOneOf — save-blocking value domain', () => {
  const schema = requiredOneOf(
    'commoditySelection',
    ['Cow', 'Fish'],
    COMMODITY_REQUIRED_MESSAGE
  )

  it('Should accept a value in the domain', () => {
    expect(run(schema, { commoditySelection: 'Cow' }).errors).toBeNull()
  })

  it('Should block blank and missing values — unlike composing requiredText with oneOf', () => {
    expect(run(schema, { commoditySelection: '' }).errors).toEqual({
      commoditySelection: COMMODITY_REQUIRED_MESSAGE
    })
    expect(run(schema, {}).errors).toEqual({
      commoditySelection: COMMODITY_REQUIRED_MESSAGE
    })
  })

  it('Should reject a value outside the domain', () => {
    expect(run(schema, { commoditySelection: 'gold-plated' }).errors).toEqual({
      commoditySelection: COMMODITY_REQUIRED_MESSAGE
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
  const schema = requiredIntegerInRange('animals', {
    min: 1,
    messages: {
      required: ANIMALS_REQUIRED_MESSAGE,
      invalid: ANIMALS_WHOLE_NUMBER_MESSAGE
    }
  })

  it('Should accept an in-range whole number', () => {
    expect(run(schema, { animals: '25' }).errors).toBeNull()
  })

  it('Should block blank, whitespace-only and missing values with the required message', () => {
    expect(run(schema, { animals: '' }).errors).toEqual({
      animals: ANIMALS_REQUIRED_MESSAGE
    })
    expect(run(schema, { animals: '   ' }).errors).toEqual({
      animals: ANIMALS_REQUIRED_MESSAGE
    })
    expect(run(schema, {}).errors).toEqual({
      animals: ANIMALS_REQUIRED_MESSAGE
    })
  })

  it('Should reject non-numeric and out-of-range values with the invalid message', () => {
    expect(run(schema, { animals: 'ten' }).errors).toEqual({
      animals: ANIMALS_WHOLE_NUMBER_MESSAGE
    })
    expect(run(schema, { animals: '0' }).errors).toEqual({
      animals: ANIMALS_WHOLE_NUMBER_MESSAGE
    })
  })

  it('Should fall back to the shared defaults when no invalid message is given', () => {
    const withoutInvalidMessage = requiredIntegerInRange('animals', {
      min: 1,
      max: 10,
      messages: { required: ANIMALS_REQUIRED_MESSAGE }
    })
    expect(run(withoutInvalidMessage, { animals: 'ten' }).errors).toEqual({
      animals: validatorDefaults.wholeNumber
    })
    expect(run(withoutInvalidMessage, { animals: '11' }).errors).toEqual({
      animals: validatorDefaults.numberBetween(1, 10)
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
  const schema = requiredMaxText('regionCode', 5, {
    required: REGION_CODE_REQUIRED_MESSAGE,
    maxLength: REGION_CODE_MAX_LENGTH_MESSAGE
  })

  it('Should accept text within the cap', () => {
    expect(run(schema, { regionCode: 'FR-75' }).errors).toBeNull()
  })

  it('Should block blank, whitespace-only and missing values', () => {
    expect(run(schema, { regionCode: '' }).errors).toEqual({
      regionCode: REGION_CODE_REQUIRED_MESSAGE
    })
    expect(run(schema, { regionCode: '   ' }).errors).toEqual({
      regionCode: REGION_CODE_REQUIRED_MESSAGE
    })
    expect(run(schema, {}).errors).toEqual({
      regionCode: REGION_CODE_REQUIRED_MESSAGE
    })
  })

  it('Should reject text over the cap with the length message', () => {
    expect(run(schema, { regionCode: 'ABCDEF' }).errors).toEqual({
      regionCode: REGION_CODE_MAX_LENGTH_MESSAGE
    })
  })

  it('Should fall back to the shared length message when none is given', () => {
    const withoutLengthMessage = requiredMaxText('regionCode', 5, {
      required: REGION_CODE_REQUIRED_MESSAGE
    })

    expect(run(withoutLengthMessage, { regionCode: 'ABCDEF' }).errors).toEqual({
      regionCode: validatorDefaults.maxLength(5)
    })
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

  it.each(['27/3', '31/2/2000', '2000-03-27', 'not a date'])(
    'Should reject %s on the single input',
    (value) => {
      expect(run(schema, { dateOfBirth: value }).errors).toEqual({
        dateOfBirth: 'Enter a valid date'
      })
    }
  )
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

  it.each(['31/2/2026', '27/3', '2026-03-27', 'not a date'])(
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
