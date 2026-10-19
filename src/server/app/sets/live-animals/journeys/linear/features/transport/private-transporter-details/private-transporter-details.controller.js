import { pagePath } from '../../../../../../../shared/paths.js'
import { TEMPLATES } from '../../../config.js'
import * as state from '../../../../../../../engine/index.js'
import {
  compose,
  maxText,
  oneOf,
  validate
} from '../../../../../../../lib/validate/index.js'
import * as kit from '../../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../../shared/copy.js'
import * as countries from '../../../../../../../services/countries/index.js'
import {
  NEW,
  PRIVATE,
  rememberTransporter
} from '../../../../../../../services/transporters/index.js'
import { organisationIdOf } from '../../../../../../../../common/helpers/organisation-id.js'
import {
  privateTransporterDetailsPage as page,
  transporterAddPage
} from '../page.js'
import { saveTransporterDetails } from '../transporter-details-save.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'

const view = `${TEMPLATES}/features/transport/private-transporter-details/private-transporter-details`

const copy = copyFor({ en, cy }).privateTransporterDetails

const MANDATORY_MESSAGES = {
  nameOrOrganisationName: copy.errors.nameRequired,
  addressLine1: copy.errors.addressLine1Required,
  townOrCity: copy.errors.townOrCityRequired,
  postcode: copy.errors.postcodeRequired,
  country: copy.errors.countryRequired,
  email: copy.errors.emailRequired,
  phone: copy.errors.telephoneRequired
}

const FIELD_ORDER = [
  'nameOrOrganisationName',
  'addressLine1',
  'addressLine2',
  'townOrCity',
  'county',
  'postcode',
  'country',
  'email',
  'phone'
]

const MAX_NAME_LENGTH = 255
const MAX_TOWN_LENGTH = 100
const MAX_POSTCODE_LENGTH = 12
const MAX_PHONE_LENGTH = 20
const MAX_EMAIL_LENGTH = 254

const fields = async () =>
  compose(
    maxText(
      'nameOrOrganisationName',
      MAX_NAME_LENGTH,
      copy.errors.nameMaxLength
    ),
    maxText('addressLine1', MAX_NAME_LENGTH, copy.errors.addressLine1MaxLength),
    maxText('addressLine2', MAX_NAME_LENGTH, copy.errors.addressLine2MaxLength),
    maxText('townOrCity', MAX_TOWN_LENGTH, copy.errors.townOrCityMaxLength),
    maxText('county', MAX_TOWN_LENGTH, copy.errors.countyMaxLength),
    maxText('postcode', MAX_POSTCODE_LENGTH, copy.errors.postcodeMaxLength),
    oneOf(
      'country',
      await countries.addressCountries(),
      copy.errors.countryFromList
    ),
    maxText('email', MAX_EMAIL_LENGTH, copy.errors.emailMaxLength),
    maxText('phone', MAX_PHONE_LENGTH, copy.errors.telephoneMaxLength)
  )

const recordProvided = (values) =>
  FIELD_ORDER.some((field) => values[field] !== '')

const missingMandatoryErrors = (values) => {
  if (!recordProvided(values)) {
    return {}
  }
  return Object.fromEntries(
    Object.entries(MANDATORY_MESSAGES).filter(([field]) => values[field] === '')
  )
}

const countryItems = async (selected) => [
  { value: '', text: copy.countryPlaceholder },
  { text: '──────────', disabled: true },
  ...(await countries.addressCountries()).map((name) => ({
    value: name,
    text: name,
    selected: name === selected
  }))
]

const render = async (
  request,
  h,
  journey,
  values,
  { errors = {}, recoverableError = false } = {}
) =>
  h.view(view, {
    ...kit.base(copy.title, {
      backLink: kit.withChangeContext(
        request,
        pagePath(journey.journeyId, transporterAddPage.slug)
      ),
      journey,
      page,
      recoverableError
    }),
    copy,
    values,
    errors,
    errorSummary: kit.errorSummary(errors),
    countryItems: await countryItems(values.country)
  })

const addressValues = (saved) => ({
  addressLine1: saved?.address?.addressLine1 ?? '',
  addressLine2: saved?.address?.addressLine2 ?? '',
  townOrCity: saved?.address?.townOrCity ?? '',
  county: saved?.address?.county ?? '',
  postcode: saved?.address?.postcode ?? '',
  country: saved?.address?.country ?? '',
  email: saved?.address?.email ?? '',
  phone: saved?.address?.phone ?? ''
})

const isCountryStale = async (name) => {
  if (!name) {
    return false
  }
  const offered = new Set(await countries.addressCountries())
  return !offered.has(name)
}

const get = async (request, h) => {
  const { journey, answers } = await state.get(request, h)
  const saved = answers.privateTransporter
  const address = addressValues(saved)
  const staleCountry = await isCountryStale(address.country)
  const values = {
    nameOrOrganisationName: saved?.name ?? '',
    ...address,
    country: staleCountry ? '' : address.country
  }
  const errors = staleCountry
    ? { country: copy.errors.countryNoLongerAvailable }
    : {}
  return render(request, h, journey, values, { errors })
}

const trimmedValues = (payload) =>
  Object.fromEntries(
    FIELD_ORDER.map((field) => [field, (payload[field] ?? '').trim()])
  )

const formErrors = async (payload, values) => {
  const { errors } = validate(await fields(), payload)
  const merged = { ...missingMandatoryErrors(values), ...errors }
  return Object.fromEntries(
    FIELD_ORDER.filter((field) => merged[field]).map((field) => [
      field,
      merged[field]
    ])
  )
}

const privateTransporter = async (values) => ({
  name: values.nameOrOrganisationName,
  address: {
    addressLine1: values.addressLine1,
    addressLine2: values.addressLine2,
    townOrCity: values.townOrCity,
    county: values.county,
    postcode: values.postcode,
    country: values.country,
    countryCode: await countries.countryCodeOf(values.country),
    phone: values.phone,
    email: values.email
  }
})

const privateTransporterRecord = async (values) => ({
  privateTransporter: await privateTransporter(values)
})

const remember = async (request, values) =>
  rememberTransporter(organisationIdOf(request), {
    ...(await privateTransporter(values)),
    type: PRIVATE,
    status: NEW
  })

const post = saveTransporterDetails({
  trimmedValues,
  formErrors,
  recordProvided,
  record: privateTransporterRecord,
  render,
  remember
})

export const routes = kit.pageRoutes(page, { get, post })
