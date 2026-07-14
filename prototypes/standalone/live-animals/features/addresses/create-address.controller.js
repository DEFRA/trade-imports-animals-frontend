import { pagePath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import { compose, maxText, oneOf, validate } from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
import { open } from '../../shared/kit.js'
import * as countries from '../../services/countries/index.js'
import * as addressBook from '../../services/address-book/index.js'

const view = `${TEMPLATES}/features/addresses/create-address`

export const CREATE_ADDRESS_SLUG = 'addresses/create'

const PARTIES = {
  placeOfOrigin: { role: 'placeOfOrigin', spoke: 'place-of-origin/select' },
  consignor: { role: 'consignor', spoke: 'consignors/select' },
  consignee: { role: 'consignee', spoke: 'consignees/select' },
  importer: { role: 'importer', spoke: 'importers/select' },
  placeOfDestination: { role: 'destination', spoke: 'destinations/select' }
}

const MANDATORY_MESSAGES = {
  nameOrOrganisationName: 'Enter a name or organisation name',
  addressLine1: 'Enter address line 1',
  townOrCity: 'Enter a town or city',
  postalOrZipCode: 'Enter a postal or zip code',
  country: 'Select a country',
  telephoneNumber: 'Enter a telephone number',
  emailAddress: 'Enter an email address'
}

const FIELD_ORDER = [
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

const fields = () =>
  compose(
    maxText(
      'nameOrOrganisationName',
      255,
      'Name or organisation name must be 255 characters or less'
    ),
    maxText(
      'addressLine1',
      255,
      'Address line 1 must be 255 characters or less'
    ),
    maxText(
      'addressLine2',
      255,
      'Address line 2 must be 255 characters or less'
    ),
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

const missingMandatoryErrors = (values) =>
  Object.fromEntries(
    Object.entries(MANDATORY_MESSAGES).filter(([field]) => values[field] === '')
  )

const countryItems = (selected) => [
  { value: '', text: 'Select a country' },
  { text: '──────────', disabled: true },
  ...countries.addressCountries().map((name) => ({
    value: name,
    text: name,
    selected: name === selected
  }))
]

const emptyValues = () =>
  Object.fromEntries(FIELD_ORDER.map((field) => [field, '']))

const render = (h, journey, partyId, values, errors = {}) =>
  h.view(view, {
    ...kit.base('Add a new address', {
      backLink: pagePath(PARTIES[partyId].spoke),
      journey
    }),
    heading: 'Add a new address',
    partyId,
    values,
    errors,
    errorSummary: kit.errorSummary(errors),
    countryItems: countryItems(values.country)
  })

const get = async (request, h) => {
  const partyId = request.query.for
  if (!PARTIES[partyId]) return h.redirect(pagePath('addresses'))
  const { journey } = await state.get(request, h)
  return render(h, journey, partyId, emptyValues())
}

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const partyId = payload.for
  if (!PARTIES[partyId]) return h.redirect(pagePath('addresses'))

  const values = Object.fromEntries(
    FIELD_ORDER.map((field) => [field, (payload[field] ?? '').trim()])
  )
  const { errors } = validate(fields(), payload)
  const merged = { ...missingMandatoryErrors(values), ...(errors ?? {}) }
  const allErrors = Object.fromEntries(
    FIELD_ORDER.filter((field) => merged[field]).map((field) => [
      field,
      merged[field]
    ])
  )
  if (Object.keys(allErrors).length > 0) {
    const { journey } = await state.get(request, h)
    return render(h, journey, partyId, values, allErrors)
  }

  const record = addressBook.addParty(PARTIES[partyId].role, {
    name: values.nameOrOrganisationName,
    address: {
      addressLine1: values.addressLine1,
      addressLine2: values.addressLine2,
      townOrCity: values.townOrCity,
      county: values.county,
      postalOrZipCode: values.postalOrZipCode,
      country: values.country,
      telephoneNumber: values.telephoneNumber,
      emailAddress: values.emailAddress
    }
  })
  await state.commit(request, h, {
    [partyId]: { name: record.name, address: { ...record.address } }
  })
  return h.redirect(pagePath('addresses'))
}

export const routes = [
  {
    method: 'GET',
    path: pagePath(CREATE_ADDRESS_SLUG),
    options: open,
    handler: get
  },
  {
    method: 'POST',
    path: pagePath(CREATE_ADDRESS_SLUG),
    options: open,
    handler: post
  }
]
