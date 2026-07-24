import { pagePath, pageRoutePath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import { compose, maxText, oneOf, validate } from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
import { routeOptions } from '../../shared/kit.js'
import { copyFor } from '../../shared/copy.js'
import * as countries from '../../services/countries/index.js'
import * as addressBook from '../../services/address-book/index.js'
import { partyOf } from './parties.js'
import { copy as en } from './copy.en.js'
import { copy as cy } from './copy.cy.js'

const view = `${TEMPLATES}/features/addresses/create-address`

export const CREATE_ADDRESS_SLUG = 'addresses/create'

const copy = copyFor({ en, cy }).createAddress

const HTTP_STATUS_BAD_REQUEST = 400

const MANDATORY_MESSAGES = {
  nameOrOrganisationName: copy.errors.nameRequired,
  addressLine1: copy.errors.addressLine1Required,
  townOrCity: copy.errors.townOrCityRequired,
  postalOrZipCode: copy.errors.postalOrZipCodeRequired,
  country: copy.errors.countryRequired,
  telephoneNumber: copy.errors.telephoneRequired,
  emailAddress: copy.errors.emailRequired
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
    maxText('nameOrOrganisationName', 255, copy.errors.nameMaxLength),
    maxText('addressLine1', 255, copy.errors.addressLine1MaxLength),
    maxText('addressLine2', 255, copy.errors.addressLine2MaxLength),
    maxText('townOrCity', 100, copy.errors.townOrCityMaxLength),
    maxText('county', 100, copy.errors.countyMaxLength),
    maxText('postalOrZipCode', 12, copy.errors.postalOrZipCodeMaxLength),
    oneOf('country', countries.addressCountries(), copy.errors.countryFromList),
    maxText('telephoneNumber', 20, copy.errors.telephoneMaxLength),
    maxText('emailAddress', 254, copy.errors.emailMaxLength)
  )

const missingMandatoryErrors = (values) =>
  Object.fromEntries(
    Object.entries(MANDATORY_MESSAGES).filter(([field]) => values[field] === '')
  )

const COUNTRY_LIST_DIVIDER = '──────────'

const countryItems = (selected) => [
  { value: '', text: copy.countryPlaceholder },
  { text: COUNTRY_LIST_DIVIDER, disabled: true },
  ...countries.addressCountries().map((name) => ({
    value: name,
    text: name,
    selected: name === selected
  }))
]

const emptyValues = () =>
  Object.fromEntries(FIELD_ORDER.map((field) => [field, '']))

const render = (
  h,
  journey,
  party,
  values,
  errors = {},
  recoverableError = false
) =>
  h.view(view, {
    ...kit.base(copy.title, {
      backLink: pagePath(journey.journeyId, party.slug),
      journey,
      recoverableError
    }),
    copy,
    partyId: party.id,
    values,
    errors,
    errorSummary: kit.errorSummary(errors),
    countryItems: countryItems(values.country)
  })

const get = async (request, h) => {
  const party = partyOf(request.query.for)
  if (!party) {
    return h.redirect(pagePath(request.params.journeyId, 'addresses'))
  }
  const { journey } = await state.get(request, h)
  return render(h, journey, party, emptyValues())
}

const trimmedValues = (payload) =>
  Object.fromEntries(
    FIELD_ORDER.map((field) => [field, (payload[field] ?? '').trim()])
  )

const fieldErrors = (payload, values) => {
  const { errors } = validate(fields(), payload)
  const merged = { ...missingMandatoryErrors(values), ...(errors ?? {}) }
  return Object.fromEntries(
    FIELD_ORDER.filter((field) => merged[field]).map((field) => [
      field,
      merged[field]
    ])
  )
}

const addressRecordFrom = (values) => ({
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

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const party = partyOf(payload.for)
  if (!party) {
    return h.redirect(pagePath(request.params.journeyId, 'addresses'))
  }

  const values = trimmedValues(payload)
  const allErrors = fieldErrors(payload, values)
  if (Object.keys(allErrors).length > 0) {
    const { journey } = await state.get(request, h)
    return render(h, journey, party, values, allErrors).code(
      HTTP_STATUS_BAD_REQUEST
    )
  }

  const record = addressRecordFrom(values)
  const failure = await kit.recoverableSave(
    async () => {
      await state.commit(request, h, {
        [party.id]: { name: record.name, address: { ...record.address } }
      })
    },
    async () => {
      const { journey } = await state.get(request, h)
      return render(h, journey, party, values, {}, true).code(500)
    }
  )
  if (failure) return failure

  addressBook.addParty(party.role, record)
  return h.redirect(pagePath(request.params.journeyId, party.returnSlug))
}

export const routes = [
  {
    method: 'GET',
    path: pageRoutePath(CREATE_ADDRESS_SLUG),
    options: routeOptions,
    handler: get
  },
  {
    method: 'POST',
    path: pageRoutePath(CREATE_ADDRESS_SLUG),
    options: routeOptions,
    handler: post
  }
]
