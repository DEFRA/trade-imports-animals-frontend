import { describe, expect, it } from 'vitest'

import { validate } from '../../../../../../../lib/validate/index.js'
import {
  addressRules,
  formValuesOf,
  isValidParty,
  partyFrom
} from './address-rules.js'

const COUNTRY_CODES = ['GB', 'FR']

const VALID = {
  name: 'Astra Rosales',
  addressLine1: '43 East Hague Extension',
  addressLine2: '',
  townOrCity: 'Bern',
  county: '',
  postcode: '30055',
  countryCode: 'FR',
  phone: '01632 960000',
  email: 'astra@example.com'
}

const errorsFor = (values) =>
  validate(addressRules(COUNTRY_CODES), { ...VALID, ...values }).errors

describe('#addressRules — the INS address book rules', () => {
  it('Should accept a complete address', () => {
    expect(errorsFor({})).toBeNull()
  })

  it.each([
    ['name', 'Enter a name'],
    ['addressLine1', 'Enter address line 1'],
    ['townOrCity', 'Enter a town or city'],
    ['postcode', 'Enter a postcode'],
    ['countryCode', 'Enter a country'],
    ['phone', 'Enter a telephone number'],
    ['email', 'Enter an email address']
  ])('Should require %s', (field, message) => {
    expect(errorsFor({ [field]: '' })[field]).toBe(message)
  })

  it.each([
    ['name', 255, 'Name must be 255 characters or fewer'],
    ['addressLine1', 255, 'Address line 1 must be 255 characters or fewer'],
    ['addressLine2', 255, 'Address line 2 must be 255 characters or fewer'],
    ['townOrCity', 100, 'Town or city must be 100 characters or fewer'],
    ['county', 100, 'County must be 100 characters or fewer'],
    ['postcode', 12, 'Postcode must be 12 characters or fewer'],
    ['phone', 20, 'Telephone number must be 20 characters or fewer'],
    ['email', 254, 'Email address must be 254 characters or fewer']
  ])('Should cap %s at %i characters', (field, max, message) => {
    // A string of `a`s is no email address, so email is measured with a
    // well-formed one; its at-the-limit case is the format rule's business.
    const isEmail = field === 'email'
    const tooLong = isEmail
      ? `${'a'.repeat(max - 'b@example.com'.length + 1)}b@example.com`
      : 'a'.repeat(max + 1)
    if (!isEmail) {
      expect(errorsFor({ [field]: 'a'.repeat(max) })?.[field]).toBeUndefined()
    }
    expect(errorsFor({ [field]: tooLong })[field]).toBe(message)
  })

  it('Should leave address line 2 and county optional', () => {
    expect(errorsFor({ addressLine2: '', county: '' })).toBeNull()
  })

  it('Should reject an email in the wrong format', () => {
    expect(errorsFor({ email: 'not-an-email' }).email).toBe(
      'Enter an email address in the correct format'
    )
  })

  it('Should reject a country not in the list', () => {
    expect(errorsFor({ countryCode: 'ZZ' }).countryCode).toBe('Enter a country')
  })
})

describe('#formValuesOf and #partyFrom', () => {
  const party = {
    name: 'Astra Rosales',
    phone: '01632 960000',
    email: 'astra@example.com',
    address: {
      addressLine1: '43 East Hague Extension',
      addressLine2: 'Floor 2',
      townOrCity: 'Bern',
      county: 'Bern',
      postcode: '30055',
      countryCode: 'CH'
    }
  }

  it('Should flatten a stored copy into form values and back again', () => {
    expect(partyFrom(formValuesOf(party))).toEqual(party)
  })

  it('Should give every field an empty value when there is no copy', () => {
    expect(Object.values(formValuesOf(undefined)).every((v) => v === '')).toBe(
      true
    )
  })
})

describe('#isValidParty', () => {
  it('Should pass a stored copy that meets every rule', () => {
    expect(isValidParty(partyFrom(VALID), COUNTRY_CODES)).toBe(true)
  })

  it('Should fail a stored copy missing a required field', () => {
    expect(
      isValidParty(partyFrom({ ...VALID, postcode: '' }), COUNTRY_CODES)
    ).toBe(false)
  })
})
