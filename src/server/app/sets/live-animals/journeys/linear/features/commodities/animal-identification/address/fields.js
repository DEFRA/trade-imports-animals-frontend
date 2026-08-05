import {
  compose,
  maxText,
  oneOf
} from '../../../../../../../../lib/validate/index.js'
import * as countries from '../../../../../../../../services/countries/index.js'
import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { fieldName } from '../fields.js'

const copy = copyFor({ en, cy }).identification

const ADDRESS_MANDATORY_MESSAGES = copy.errors.addressMandatory

const ADDRESS_FIELD_ORDER = [
  'nameOrOrganisationName',
  'addressLine1',
  'addressLine2',
  'townOrCity',
  'county',
  'postalOrZipCode',
  'country',
  'telephoneNumber',
  'emailAddress'
]

const ADDRESS_LINE_MAX_LENGTH = 255
const TOWN_OR_COUNTY_MAX_LENGTH = 100
const POSTCODE_MAX_LENGTH = 12
const TELEPHONE_MAX_LENGTH = 20
const EMAIL_MAX_LENGTH = 254

export const addressChecksFor = (index) =>
  compose(
    maxText(
      fieldName('nameOrOrganisationName', index),
      ADDRESS_LINE_MAX_LENGTH,
      copy.errors.addressFormat.nameOrOrganisationName
    ),
    maxText(
      fieldName('addressLine1', index),
      ADDRESS_LINE_MAX_LENGTH,
      copy.errors.addressFormat.addressLine1
    ),
    maxText(
      fieldName('addressLine2', index),
      ADDRESS_LINE_MAX_LENGTH,
      copy.errors.addressFormat.addressLine2
    ),
    maxText(
      fieldName('townOrCity', index),
      TOWN_OR_COUNTY_MAX_LENGTH,
      copy.errors.addressFormat.townOrCity
    ),
    maxText(
      fieldName('county', index),
      TOWN_OR_COUNTY_MAX_LENGTH,
      copy.errors.addressFormat.county
    ),
    maxText(
      fieldName('postalOrZipCode', index),
      POSTCODE_MAX_LENGTH,
      copy.errors.addressFormat.postalOrZipCode
    ),
    oneOf(
      fieldName('country', index),
      countries.addressCountries(),
      copy.errors.addressFormat.country
    ),
    maxText(
      fieldName('telephoneNumber', index),
      TELEPHONE_MAX_LENGTH,
      copy.errors.addressFormat.telephoneNumber
    ),
    maxText(
      fieldName('emailAddress', index),
      EMAIL_MAX_LENGTH,
      copy.errors.addressFormat.emailAddress
    )
  )

export const addressValuesFromPayload = (payload, index) =>
  Object.fromEntries(
    ADDRESS_FIELD_ORDER.map((field) => [
      field,
      (payload[fieldName(field, index)] ?? '').trim()
    ])
  )

export const blankAddress = () =>
  Object.fromEntries(ADDRESS_FIELD_ORDER.map((field) => [field, '']))

export const addressRecordProvided = (values) =>
  ADDRESS_FIELD_ORDER.some((field) => values[field] !== '')

export const missingAddressErrors = (values, index) => {
  if (!addressRecordProvided(values)) {
    return {}
  }
  return Object.fromEntries(
    Object.entries(ADDRESS_MANDATORY_MESSAGES)
      .filter(([field]) => values[field] === '')
      .map(([field, message]) => [fieldName(field, index), message])
  )
}

const addressCountryItems = (selected) => [
  { value: '', text: copy.address.countryPlaceholder },
  ...countries.addressCountries().map((name) => ({
    value: name,
    text: name,
    selected: name === selected
  }))
]

export const addressFieldsFor = (index, values, errors) => {
  const input = (id, label, extra = {}) => ({
    kind: 'input',
    id: fieldName(id, index),
    label,
    value: values[id] ?? '',
    error: errors[fieldName(id, index)],
    ...extra
  })
  return [
    input('nameOrOrganisationName', copy.address.nameOrOrganisationName, {
      autocomplete: 'name'
    }),
    input('addressLine1', copy.address.addressLine1, {
      autocomplete: 'address-line1'
    }),
    input('addressLine2', copy.address.addressLine2, {
      autocomplete: 'address-line2'
    }),
    input('townOrCity', copy.address.townOrCity, {
      classes: 'govuk-!-width-two-thirds',
      autocomplete: 'address-level2'
    }),
    input('county', copy.address.county, {
      classes: 'govuk-!-width-two-thirds'
    }),
    input('postalOrZipCode', copy.address.postalOrZipCode, {
      classes: 'govuk-input--width-10',
      autocomplete: 'postal-code'
    }),
    {
      kind: 'select',
      id: fieldName('country', index),
      label: copy.address.country,
      items: addressCountryItems(values.country ?? ''),
      error: errors[fieldName('country', index)]
    },
    input('telephoneNumber', copy.address.telephoneNumber, {
      type: 'tel',
      classes: 'govuk-input--width-20',
      autocomplete: 'tel'
    }),
    input('emailAddress', copy.address.emailAddress, {
      type: 'email',
      autocomplete: 'email'
    })
  ]
}
