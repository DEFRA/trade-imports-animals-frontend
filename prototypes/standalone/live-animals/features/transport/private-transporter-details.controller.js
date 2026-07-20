import { pagePath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import { compose, maxText, oneOf, validate } from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
import * as countries from '../../services/countries/index.js'
import { privateTransporterDetailsPage as page } from './page.js'

export const meta = { ...page, collects: ['privateTransporter'] }
const view = `${TEMPLATES}/features/transport/private-transporter-details`

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

const fields = compose(
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

const recordProvided = (values) =>
  FIELD_ORDER.some((field) => values[field] !== '')

const missingMandatoryErrors = (values) => {
  if (!recordProvided(values)) return {}
  return Object.fromEntries(
    Object.entries(MANDATORY_MESSAGES).filter(([field]) => values[field] === '')
  )
}

const countryItems = (selected) => [
  { value: '', text: 'Select a country' },
  { text: '──────────', disabled: true },
  ...countries.addressCountries().map((name) => ({
    value: name,
    text: name,
    selected: name === selected
  }))
]

const render = (h, journey, values, errors = {}) =>
  h.view(view, {
    ...kit.base('Private transporter details', {
      backLink: pagePath('transporters'),
      journey
    }),
    heading: 'Private transporter details',
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

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const values = Object.fromEntries(
    FIELD_ORDER.map((field) => [field, (payload[field] ?? '').trim()])
  )
  const { errors } = validate(fields, payload)
  const merged = { ...missingMandatoryErrors(values), ...(errors ?? {}) }
  const allErrors = Object.fromEntries(
    FIELD_ORDER.filter((field) => merged[field]).map((field) => [
      field,
      merged[field]
    ])
  )
  if (Object.keys(allErrors).length > 0) {
    const { journey } = await state.get(request, h)
    return render(h, journey, values, allErrors)
  }

  const { scope } = await (recordProvided(values)
    ? state.commit(request, h, {
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
    : state.get(request, h))
  return h.redirect(await kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })
