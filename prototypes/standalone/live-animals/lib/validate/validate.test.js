import { describe, expect, it } from 'vitest'

import {
  compose,
  currency,
  dateParts,
  integerInRange,
  maxText,
  oneOf,
  postcode,
  requiredOneOf,
  requiredText,
  ukPhone,
  validate,
  vehicleReg
} from './index.js'

const run = (schema, payload) => validate(schema, payload)

describe('#requiredText — the sole save-blocking primitive', () => {
  const schema = requiredText('fullName', 'Enter your full name')

  it('Should pass a non-blank value', () => {
    expect(run(schema, { fullName: 'Alex Driver' }).errors).toBeNull()
  })

  it('Should block a missing value with the given message on the field', () => {
    expect(run(schema, {}).errors).toEqual({
      fullName: 'Enter your full name'
    })
  })

  it('Should block a whitespace-only value (trimmed to empty)', () => {
    expect(run(schema, { fullName: '   ' }).errors).toEqual({
      fullName: 'Enter your full name'
    })
  })
})

describe('optional validators save blank (the mandate split)', () => {
  it.each([
    ['postcode', postcode('postcode')],
    ['registration', vehicleReg('registration')],
    ['phone', ukPhone('phone')],
    ['year', integerInRange('year', { min: 1900, max: 2100 })],
    ['estimatedValue', currency('estimatedValue')],
    ['country', oneOf('country', ['england', 'wales'])],
    ['modDescription', maxText('modDescription', 200)]
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
  const schema = oneOf('typeSelection', ['domestic', 'wild'])

  it('Should accept a value in the domain', () => {
    expect(run(schema, { typeSelection: 'domestic' }).errors).toBeNull()
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
    ['0102 - Cattle', '0301 - Fish'],
    'Select a commodity'
  )

  it('Should accept a value in the domain', () => {
    expect(
      run(schema, { commoditySelection: '0102 - Cattle' }).errors
    ).toBeNull()
  })

  it('Should block blank and missing values — unlike composing requiredText with oneOf', () => {
    expect(run(schema, { commoditySelection: '' }).errors).toEqual({
      commoditySelection: 'Select a commodity'
    })
    expect(run(schema, {}).errors).toEqual({
      commoditySelection: 'Select a commodity'
    })
  })

  it('Should reject a value outside the domain', () => {
    expect(run(schema, { commoditySelection: 'gold-plated' }).errors).toEqual({
      commoditySelection: 'Select a commodity'
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

describe('#currency — positive amount, £/commas stripped', () => {
  it('Should accept and clean a formatted amount', () => {
    const { value, errors } = run(currency('estimatedValue'), {
      estimatedValue: '£8,000'
    })
    expect(errors).toBeNull()
    expect(value.estimatedValue).toBe('8000')
  })

  it('Should reject zero, negatives, decimals and non-numbers', () => {
    for (const bad of ['0', '-5', '12.50', 'lots']) {
      expect(run(currency('amount'), { amount: bad }).errors).toHaveProperty(
        'amount'
      )
    }
  })
})

describe('#maxText — length cap', () => {
  const schema = maxText('modDescription', 10)

  it('Should accept text within the cap', () => {
    expect(run(schema, { modDescription: 'short' }).errors).toBeNull()
  })

  it('Should reject text over the cap', () => {
    expect(
      run(schema, { modDescription: 'far too long to allow' }).errors
    ).toHaveProperty('modDescription')
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

describe('#compose + the Joi → GDS mapping', () => {
  const schema = compose(
    requiredText('fullName', 'Enter your full name'),
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
      fullName: 'Enter your full name',
      postcode: 'Enter a valid postcode'
    })
  })

  it('Should return null errors when everything is valid', () => {
    expect(run(schema, { fullName: 'Alex', postcode: '' }).errors).toBeNull()
  })
})
