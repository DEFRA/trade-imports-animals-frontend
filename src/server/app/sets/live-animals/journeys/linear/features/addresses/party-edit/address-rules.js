import {
  compose,
  maxText,
  requiredEmail,
  requiredMaxText,
  requiredOneOf,
  validate
} from '../../../../../../../lib/validate/index.js'
import { copyFor } from '../../../../../../../shared/copy.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'

/** Copied from the INS address book (features/address-book/fields.js). */
export const FIELD_RULES = {
  name: { maxLength: 255, required: true },
  addressLine1: { maxLength: 255, required: true },
  addressLine2: { maxLength: 255, required: false },
  townOrCity: { maxLength: 100, required: true },
  county: { maxLength: 100, required: false },
  postcode: { maxLength: 12, required: true },
  countryCode: { required: true },
  phone: { maxLength: 20, required: true },
  email: { maxLength: 254, required: true, email: true }
}

export const FIELDS = Object.keys(FIELD_RULES)

const { errors } = copyFor({ en, cy })

const maxLengthOf = (field) => FIELD_RULES[field].maxLength

const maxLengthMessageFor = (field) =>
  errors[field].maxLength(maxLengthOf(field))

const requiredTextRule = (field) =>
  requiredMaxText(field, maxLengthOf(field), {
    required: errors[field].required,
    maxLength: maxLengthMessageFor(field)
  })

const optionalTextRule = (field) =>
  maxText(field, maxLengthOf(field), maxLengthMessageFor(field))

export const addressRules = (countryCodes) =>
  compose(
    requiredTextRule('name'),
    requiredTextRule('addressLine1'),
    optionalTextRule('addressLine2'),
    requiredTextRule('townOrCity'),
    optionalTextRule('county'),
    requiredTextRule('postcode'),
    requiredOneOf('countryCode', countryCodes, errors.countryCode.required),
    requiredTextRule('phone'),
    requiredEmail('email', maxLengthOf('email'), {
      required: errors.email.required,
      maxLength: maxLengthMessageFor('email'),
      format: errors.email.format
    })
  )

const PARTY_LEVEL_FIELDS = new Set(['name', 'phone', 'email'])

export const formValuesOf = (party = {}) =>
  Object.fromEntries(
    FIELDS.map((field) => {
      const source = PARTY_LEVEL_FIELDS.has(field) ? party : party.address
      return [field, source?.[field] ?? '']
    })
  )

/** Leaves out `pickedFromId`: an edited copy no longer matches the record it
 * was picked from, so the picker should not pre-select it. */
export const partyFrom = (values) => ({
  name: values.name,
  phone: values.phone,
  email: values.email,
  address: {
    addressLine1: values.addressLine1,
    addressLine2: values.addressLine2,
    townOrCity: values.townOrCity,
    county: values.county,
    postcode: values.postcode,
    countryCode: values.countryCode
  }
})

export const isValidParty = (party, countryCodes) =>
  validate(addressRules(countryCodes), formValuesOf(party)).errors === null
