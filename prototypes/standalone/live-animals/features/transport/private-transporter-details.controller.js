import { pagePath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import { compose, maxText, oneOf, validate } from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
import * as countries from '../../services/countries/index.js'
import { privateTransporterDetailsPage as page } from './page.js'
import { privateTransporter } from './obligations.js'

/**
 * The private spoke of the transporter-type split: unlike the commercial
 * select spoke there is no approved list to copy from, so the V4 Standard
 * Address Block (spec fieldGroups.address) is keyed in as govuk inputs.
 * The whole group commits as ONE { name, address } object so the answer is
 * shape-compatible with the copied party records (c-020) and the CYA row.
 * Same in-section conditional shape as the select spoke — the derived gate
 * keeps it reachable only while the type is 'Private transporter'.
 */
export const meta = { ...page, collects: [privateTransporter.id] }
const view = `${TEMPLATES}/features/transport/private-transporter-details`

// V4 fieldGroups.address mandates: these fields are Mandatory once an
// address record is provided; addressLine2 and county stay optional.
const MANDATORY_MESSAGES = {
  nameOrOrganisationName: 'Enter a name or organisation name',
  addressLine1: 'Enter address line 1',
  townOrCity: 'Enter a town or city',
  postalOrZipCode: 'Enter a postal or zip code',
  country: 'Select a country',
  telephoneNumber: 'Enter a telephone number',
  emailAddress: 'Enter an email address'
}

// Display order — drives payload reading, error-summary order and the
// committed address shape.
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

// Per-field format checks (V4 max lengths + the country enum) all let blank
// through — requiredness is the record-level check below, not Joi's.
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

/**
 * privateTransporter is enforcedAt=submit, so an ALL-BLANK save is "not
 * answered yet" and walks on committing nothing. But the V4 fieldGroup says
 * its per-field mandates apply "once the record is provided": a PARTIAL fill
 * blocks the save naming the missing mandatory fields — the same blank-vs-
 * partial semantics as the arrival date's dateParts, and it keeps isAnswered
 * honest (a committed record is always a complete one, mirroring
 * entryComplete's never-falsely-complete stance).
 */
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

const render = (h, values, errors = {}) =>
  h.view(view, {
    ...kit.base('Private transporter details', {
      backLink: pagePath('transporters')
    }),
    heading: 'Private transporter details',
    values,
    errors,
    errorSummary: kit.errorSummary(errors),
    countryItems: countryItems(values.country)
  })

const get = (request, h) => {
  const { answers } = state.get(request, h)
  // Flatten the saved { name, address } record back into the form fields.
  const saved = answers.privateTransporter
  return render(h, {
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

const post = (request, h) => {
  const payload = request.payload ?? {}
  const values = Object.fromEntries(
    FIELD_ORDER.map((field) => [field, (payload[field] ?? '').trim()])
  )
  const { errors } = validate(fields, payload)
  // FIELD_ORDER keeps the error summary in display order whichever check fired.
  const merged = { ...missingMandatoryErrors(values), ...(errors ?? {}) }
  const allErrors = Object.fromEntries(
    FIELD_ORDER.filter((field) => merged[field]).map((field) => [
      field,
      merged[field]
    ])
  )
  if (Object.keys(allErrors).length > 0) return render(h, values, allErrors)

  // A complete record commits as one { name, address } object (the party-
  // record shape, c-020); an all-blank save commits nothing and walks on
  // with the current scope.
  const { scope } = recordProvided(values)
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
    : state.get(request, h)
  return h.redirect(kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })
