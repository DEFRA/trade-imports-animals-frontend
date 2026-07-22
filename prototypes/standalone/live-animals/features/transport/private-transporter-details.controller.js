import { pagePath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import { compose, maxText, oneOf, validate } from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
import { copyFor } from '../../shared/copy.js'
import * as countries from '../../services/countries/index.js'
import { privateTransporterDetailsPage as page } from './page.js'
import { copy as en } from './copy.en.js'
import { copy as cy } from './copy.cy.js'

export const meta = { ...page, collects: ['privateTransporter'] }
const view = `${TEMPLATES}/features/transport/private-transporter-details`

const copy = copyFor({ en, cy }).privateTransporterDetails

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

const MAX_NAME_LENGTH = 255
const MAX_TOWN_LENGTH = 100
const MAX_POSTCODE_LENGTH = 12
const MAX_PHONE_LENGTH = 20
const MAX_EMAIL_LENGTH = 254

const fields = compose(
  maxText('nameOrOrganisationName', MAX_NAME_LENGTH, copy.errors.nameMaxLength),
  maxText('addressLine1', MAX_NAME_LENGTH, copy.errors.addressLine1MaxLength),
  maxText('addressLine2', MAX_NAME_LENGTH, copy.errors.addressLine2MaxLength),
  maxText('townOrCity', MAX_TOWN_LENGTH, copy.errors.townOrCityMaxLength),
  maxText('county', MAX_TOWN_LENGTH, copy.errors.countyMaxLength),
  maxText(
    'postalOrZipCode',
    MAX_POSTCODE_LENGTH,
    copy.errors.postalOrZipCodeMaxLength
  ),
  oneOf('country', countries.addressCountries(), copy.errors.countryFromList),
  maxText('telephoneNumber', MAX_PHONE_LENGTH, copy.errors.telephoneMaxLength),
  maxText('emailAddress', MAX_EMAIL_LENGTH, copy.errors.emailMaxLength)
)

const recordProvided = (values) =>
  FIELD_ORDER.some((field) => values[field] !== '')

const missingMandatoryErrors = (values) => {
  if (!recordProvided(values)) return {}
  return Object.fromEntries(
    Object.entries(MANDATORY_MESSAGES).filter(([field]) => values[field] === '')
  )
}

const countryItems = (selected) => [
  { value: '', text: copy.countryPlaceholder },
  { text: '──────────', disabled: true },
  ...countries.addressCountries().map((name) => ({
    value: name,
    text: name,
    selected: name === selected
  }))
]

const render = (h, journey, values, errors = {}) =>
  h.view(view, {
    ...kit.base(copy.title, {
      backLink: pagePath('transporters'),
      journey
    }),
    copy,
    values,
    errors,
    errorSummary: kit.errorSummary(errors),
    countryItems: countryItems(values.country)
  })

const get = async (request, h) => {
  const { journey, answers } = await state.get(request, h)
  const saved = answers.privateTransporter
  return render(h, journey, {
    nameOrOrganisationName: saved?.name ?? '',
    addressLine1: saved?.address?.addressLine1 ?? '',
    addressLine2: saved?.address?.addressLine2 ?? '',
    townOrCity: saved?.address?.townOrCity ?? '',
    county: saved?.address?.county ?? '',
    postalOrZipCode: saved?.address?.postalOrZipCode ?? '',
    country: saved?.address?.country ?? '',
    telephoneNumber: saved?.address?.telephoneNumber ?? '',
    emailAddress: saved?.address?.emailAddress ?? ''
  })
}

const trimmedValues = (payload) =>
  Object.fromEntries(
    FIELD_ORDER.map((field) => [field, (payload[field] ?? '').trim()])
  )

const formErrors = (payload, values) => {
  const { errors } = validate(fields, payload)
  const merged = { ...missingMandatoryErrors(values), ...(errors ?? {}) }
  return Object.fromEntries(
    FIELD_ORDER.filter((field) => merged[field]).map((field) => [
      field,
      merged[field]
    ])
  )
}

const privateTransporterRecord = (values) => ({
  privateTransporter: {
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
  }
})

const commitOrSkip = (request, h, values) =>
  recordProvided(values)
    ? state.commit(request, h, privateTransporterRecord(values))
    : state.get(request, h)

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const values = trimmedValues(payload)
  const allErrors = formErrors(payload, values)
  if (Object.keys(allErrors).length > 0) {
    const { journey } = await state.get(request, h)
    return render(h, journey, values, allErrors)
  }

  const { scope } = await commitOrSkip(request, h, values)
  return h.redirect(await kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })
