import { pagePath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import { compose, maxText, oneOf, validate } from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
import { open } from '../../shared/kit.js'
import * as countries from '../../services/countries/index.js'
import {
  animalIdentifierPassport,
  animalIdentifierTattoo,
  animalIdentifierEarTag,
  horseName,
  permanentAddress
} from './obligations.js'

const view = `${TEMPLATES}/features/commodities/animal-identifiers-entry`

const typeApplies = (obligation, commodity) =>
  obligation.activatedBy.includes.includes(commodity)

const TYPE_FIELDS = [
  {
    obligation: animalIdentifierPassport,
    id: 'animalIdentifierPassport',
    label: 'Passport number',
    hint: 'For example, UK123456789'
  },
  {
    obligation: animalIdentifierTattoo,
    id: 'animalIdentifierTattoo',
    label: 'Tattoo',
    hint: 'For example, AB1234'
  },
  {
    obligation: animalIdentifierEarTag,
    id: 'animalIdentifierEarTag',
    label: 'Ear tag number',
    hint: 'For example, UK123456789012'
  },
  { obligation: horseName, id: 'horseName', label: 'Horse name' }
]

const FALLBACK_FIELDS = [
  {
    id: 'animalIdentifierIdentificationDetails',
    label: 'Identification details',
    hint: 'Any other way this animal is identified, if it has no passport, tattoo or ear tag'
  },
  {
    id: 'animalIdentifierDescription',
    label: 'Animal description'
  }
]

const ADDRESS_MANDATORY_MESSAGES = {
  nameOrOrganisationName: 'Enter a name or organisation name',
  addressLine1: 'Enter address line 1',
  townOrCity: 'Enter a town or city',
  postalOrZipCode: 'Enter a postal or zip code',
  country: 'Select a country',
  telephoneNumber: 'Enter a telephone number',
  emailAddress: 'Enter an email address'
}

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

const identifierFieldChecks = compose(
  maxText(
    'animalIdentifierPassport',
    58,
    'Passport must be 58 characters or fewer'
  ),
  maxText(
    'animalIdentifierTattoo',
    58,
    'Tattoo must be 58 characters or fewer'
  ),
  maxText(
    'animalIdentifierEarTag',
    58,
    'Ear tag must be 58 characters or fewer'
  ),
  maxText('horseName', 58, 'Horse name must be 58 characters or fewer'),
  maxText(
    'animalIdentifierIdentificationDetails',
    58,
    'Identification details must be 58 characters or fewer'
  ),
  maxText(
    'animalIdentifierDescription',
    58,
    'Description must be 58 characters or fewer'
  )
)

const addressChecks = compose(
  maxText(
    'nameOrOrganisationName',
    255,
    'Name or organisation name must be 255 characters or less'
  ),
  maxText('addressLine1', 255, 'Address line 1 must be 255 characters or less'),
  maxText('addressLine2', 255, 'Address line 2 must be 255 characters or less'),
  maxText('townOrCity', 100, 'Town or city must be 100 characters or less'),
  maxText('county', 100, 'County must be 100 characters or less'),
  maxText(
    'postalOrZipCode',
    12,
    'Postal or zip code must be 12 characters or less'
  ),
  oneOf(
    'country',
    countries.addressCountries(),
    'Select a country from the list'
  ),
  maxText(
    'telephoneNumber',
    20,
    'Telephone number must be 20 characters or less'
  ),
  maxText('emailAddress', 254, 'Email address must be 254 characters or less')
)

const lineIndexOf = (request, answers) => {
  const index = Number(request.params.index)
  const lines = answers.commodityLines ?? []
  return Number.isInteger(index) && index >= 0 && index < lines.length
    ? index
    : null
}

const scopedTypeFields = (commodity) =>
  TYPE_FIELDS.filter((field) => typeApplies(field.obligation, commodity))

const permanentAddressApplies = (commodity) =>
  permanentAddress.activatedBy.includes.includes(commodity)

const addressRecordProvided = (values) =>
  ADDRESS_FIELD_ORDER.some((field) => values[field] !== '')

const missingAddressErrors = (values) => {
  if (!addressRecordProvided(values)) return {}
  return Object.fromEntries(
    Object.entries(ADDRESS_MANDATORY_MESSAGES).filter(
      ([field]) => values[field] === ''
    )
  )
}

const addressCountryItems = (selected) => [
  { value: '', text: 'Select a country' },
  ...countries.addressCountries().map((name) => ({
    value: name,
    text: name,
    selected: name === selected
  }))
]

const blankAddress = () =>
  Object.fromEntries(ADDRESS_FIELD_ORDER.map((field) => [field, '']))

const render = (h, index, commodity, values, addressValues, errors = {}) => {
  const showAddress = permanentAddressApplies(commodity)
  return h.view(view, {
    ...kit.base('Add an animal', {
      backLink: pagePath(`commodities/${index}/identifiers`)
    }),
    heading: 'Add an animal',
    commodity,
    fields: [
      ...scopedTypeFields(commodity).map((field) => ({
        ...field,
        value: values[field.id] ?? '',
        error: errors[field.id]
      })),
      ...FALLBACK_FIELDS.map((field) => ({
        ...field,
        value: values[field.id] ?? '',
        error: errors[field.id]
      }))
    ],
    showAddress,
    addressValues,
    addressCountryItems: showAddress
      ? addressCountryItems(addressValues.country)
      : [],
    addressErrors: errors,
    errors,
    errorSummary: kit.errorSummary(errors)
  })
}

const identifierValuesFromPayload = (payload, commodity) =>
  Object.fromEntries(
    [...scopedTypeFields(commodity), ...FALLBACK_FIELDS].map((field) => [
      field.id,
      (payload[field.id] ?? '').trim()
    ])
  )

const addressValuesFromPayload = (payload) =>
  Object.fromEntries(
    ADDRESS_FIELD_ORDER.map((field) => [field, (payload[field] ?? '').trim()])
  )

const getAdd = (request, h) => {
  const { answers } = state.get(request, h)
  const index = lineIndexOf(request, answers)
  if (index === null) return h.redirect(pagePath('commodities'))
  const commodity = answers.commodityLines[index].commoditySelection
  const values = Object.fromEntries(
    [...scopedTypeFields(commodity), ...FALLBACK_FIELDS].map((field) => [
      field.id,
      ''
    ])
  )
  return render(h, index, commodity, values, blankAddress())
}

const postAdd = (request, h) => {
  const { answers } = state.get(request, h)
  const index = lineIndexOf(request, answers)
  if (index === null) return h.redirect(pagePath('commodities'))
  const commodity = answers.commodityLines[index].commoditySelection
  const payload = request.payload ?? {}

  const values = identifierValuesFromPayload(payload, commodity)
  const addressValues = addressValuesFromPayload(payload)
  const showAddress = permanentAddressApplies(commodity)

  const { errors: idErrors } = validate(identifierFieldChecks, payload)
  const { errors: addrFormatErrors } = showAddress
    ? validate(addressChecks, payload)
    : { errors: null }
  const merged = {
    ...(idErrors ?? {}),
    ...(showAddress ? missingAddressErrors(addressValues) : {}),
    ...(addrFormatErrors ?? {})
  }
  if (Object.keys(merged).length > 0) {
    return render(h, index, commodity, values, addressValues, merged)
  }

  const unit = { ...values }
  if (showAddress && addressRecordProvided(addressValues)) {
    unit.permanentAddress = {
      name: addressValues.nameOrOrganisationName,
      address: {
        addressLine1: addressValues.addressLine1,
        addressLine2: addressValues.addressLine2,
        townOrCity: addressValues.townOrCity,
        county: addressValues.county,
        postalOrZipCode: addressValues.postalOrZipCode,
        country: addressValues.country,
        telephoneNumber: addressValues.telephoneNumber,
        emailAddress: addressValues.emailAddress
      }
    }
  }

  state.appendEntryAt(
    request,
    h,
    ['commodityLines', index, 'animalIdentifiers'],
    unit
  )
  return h.redirect(pagePath(`commodities/${index}/identifiers`))
}

const getRemove = (request, h) => {
  const { answers } = state.get(request, h)
  const index = lineIndexOf(request, answers)
  if (index === null) return h.redirect(pagePath('commodities'))
  state.removeEntryAt(
    request,
    h,
    ['commodityLines', index, 'animalIdentifiers'],
    Number(request.params.unit)
  )
  return h.redirect(pagePath(`commodities/${index}/identifiers`))
}

export const routes = [
  {
    method: 'GET',
    path: pagePath('commodities/{index}/identifiers/add'),
    options: open,
    handler: getAdd
  },
  {
    method: 'POST',
    path: pagePath('commodities/{index}/identifiers/add'),
    options: open,
    handler: postAdd
  },
  {
    method: 'GET',
    path: pagePath('commodities/{index}/identifiers/{unit}/remove'),
    options: open,
    handler: getRemove
  }
]
