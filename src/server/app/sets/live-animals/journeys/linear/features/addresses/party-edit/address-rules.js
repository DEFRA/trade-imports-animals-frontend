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

/** The GOV.UK autocomplete token for each field that has one, and the width
 * class each field's input carries, as party-edit.njk's inputs are built. */
export const AUTOCOMPLETE_TOKENS = {
  name: 'organization',
  addressLine1: 'address-line1',
  addressLine2: 'address-line2',
  townOrCity: 'address-level2',
  postcode: 'postal-code',
  phone: 'tel',
  email: 'email'
}

const TWO_THIRDS_WIDTH = 'govuk-!-width-two-thirds'

export const FIELD_CLASSES = {
  name: TWO_THIRDS_WIDTH,
  addressLine1: TWO_THIRDS_WIDTH,
  addressLine2: TWO_THIRDS_WIDTH,
  townOrCity: TWO_THIRDS_WIDTH,
  county: TWO_THIRDS_WIDTH,
  postcode: 'govuk-input--width-10',
  phone: TWO_THIRDS_WIDTH,
  email: TWO_THIRDS_WIDTH
}

const { errors } = copyFor({ en, cy })

const maxLengthOf = (field) => FIELD_RULES[field].maxLength

const maxLengthMessageFor = (field) =>
  errors[field].maxLength(maxLengthOf(field))

/**
 * The required-with-cap rule for an address field: blank refuses with
 * `required`, over `field`'s V4 limit refuses with this feature's over-long
 * message for `field`.
 *
 * @param {string} field - a key of `FIELD_RULES` whose limit and over-long
 * message the rule reads.
 * @param {object} [options]
 * @param {string} [options.key] - the key the rule reports its error under,
 * defaulting to `field`.
 * @param {string} [options.required] - the message shown when the value is
 * blank, defaulting to this feature's own required message for `field`.
 */
export const requiredTextRule = (
  field,
  { key = field, required = errors[field].required } = {}
) =>
  requiredMaxText(key, maxLengthOf(field), {
    required,
    maxLength: maxLengthMessageFor(field)
  })

/**
 * The optional-with-cap rule for an address field, keyed the same way as
 * `requiredTextRule`.
 *
 * @param {string} field - a key of `FIELD_RULES` whose limit and over-long
 * message the rule reads.
 * @param {object} [options]
 * @param {string} [options.key] - the key the rule reports its error under,
 * defaulting to `field`.
 */
export const optionalTextRule = (field, { key = field } = {}) =>
  maxText(key, maxLengthOf(field), maxLengthMessageFor(field))

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
