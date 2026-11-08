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
  PRIVATE,
  saveTransporter
} from '../../../../../../../services/transporters/index.js'
import { organisationIdOf } from '../../../../../../../../common/helpers/organisation-id.js'
import {
  privateTransporterDetailsPage as page,
  transporterAddPage
} from '../page.js'
import { saveTransporterDetails } from '../transporter-details-save.js'
import { redirectUnlessOwnTransporterType } from '../own-transporter-type.js'
import { storedEnteredTransporter } from '../transporter-add-session.js'
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
  { value: '', text: copy.countrySelectText },
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
      recoverableError,
      showJourneyStrip: false
    }),
    copy,
    values,
    errors,
    errorSummary: kit.errorSummary(errors),
    countryItems: await countryItems(values.country)
  })

const addressValues = (address) => ({
  addressLine1: address?.addressLine1 ?? '',
  addressLine2: address?.addressLine2 ?? '',
  townOrCity: address?.townOrCity ?? '',
  county: address?.county ?? '',
  postcode: address?.postcode ?? '',
  country: address?.country ?? '',
  email: address?.email ?? '',
  phone: address?.phone ?? ''
})

const isCountryStale = async (name) => {
  if (!name) {
    return false
  }
  const offered = new Set(await countries.addressCountries())
  return !offered.has(name)
}

const valuesOfSavedPrivateTransporter = (saved) => {
  const address = addressValues(saved?.address)
  return {
    nameOrOrganisationName: saved?.name ?? '',
    ...address
  }
}

const get = async (request, h) => {
  const redirect = await redirectUnlessOwnTransporterType(request, h, PRIVATE)
  if (redirect) {
    return redirect
  }
  const { journey, answers, flowOnlyAnswers } = await state.get(request, h)
  const shownValues =
    storedEnteredTransporter(flowOnlyAnswers, PRIVATE) ??
    valuesOfSavedPrivateTransporter(answers.privateTransporter)
  const staleCountry = await isCountryStale(shownValues.country)
  const values = {
    ...shownValues,
    country: staleCountry ? '' : shownValues.country
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
  saveTransporter(
    organisationIdOf(request),
    await privateTransporter(values),
    'PRIVATE'
  )

const post = saveTransporterDetails({
  transporterType: PRIVATE,
  trimmedValues,
  formErrors,
  recordProvided,
  record: privateTransporterRecord,
  render,
  remember
})

export const routes = kit.pageRoutes(page, { get, post })
