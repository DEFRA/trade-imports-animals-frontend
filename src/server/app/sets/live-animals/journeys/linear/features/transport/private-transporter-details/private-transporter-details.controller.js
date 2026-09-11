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

/** The private arm of the add route.
 *
 * A spoke off the type chooser rather than a step in the journey: the
 * `privateTransporter` it writes is declared by the transporter list, which is
 * where a trader normally answers it by picking a row. */
const view = `${TEMPLATES}/features/transport/private-transporter-details/private-transporter-details`

const copy = copyFor({ en, cy }).privateTransporterDetails

const MANDATORY_MESSAGES = {
  nameOrOrganisationName: copy.errors.nameRequired,
  addressLine1: copy.errors.addressLine1Required,
  townOrCity: copy.errors.townOrCityRequired,
  postalOrZipCode: copy.errors.postalOrZipCodeRequired,
  country: copy.errors.countryRequired,
  emailAddress: copy.errors.emailRequired,
  telephoneNumber: copy.errors.telephoneRequired
}

/** The fields the page shows, in the order it asks for them — the order the
 * error summary lists them in too. The contact details close the form, email
 * before phone, as design release 1 asks them. */
const FIELD_ORDER = [
  'nameOrOrganisationName',
  'addressLine1',
  'addressLine2',
  'townOrCity',
  'county',
  'postalOrZipCode',
  'country',
  'emailAddress',
  'telephoneNumber'
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
  maxText('emailAddress', MAX_EMAIL_LENGTH, copy.errors.emailMaxLength),
  maxText('telephoneNumber', MAX_PHONE_LENGTH, copy.errors.telephoneMaxLength)
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

const countryItems = (selected) => [
  { value: '', text: copy.countryPlaceholder },
  { text: '──────────', disabled: true },
  ...countries.addressCountries().map((name) => ({
    value: name,
    text: name,
    selected: name === selected
  }))
]

const render = (
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
    countryItems: countryItems(values.country)
  })

const get = async (request, h) => {
  const { journey, answers } = await state.get(request, h)
  const saved = answers.privateTransporter
  return render(request, h, journey, {
    nameOrOrganisationName: saved?.name ?? '',
    addressLine1: saved?.address?.addressLine1 ?? '',
    addressLine2: saved?.address?.addressLine2 ?? '',
    townOrCity: saved?.address?.townOrCity ?? '',
    county: saved?.address?.county ?? '',
    postalOrZipCode: saved?.address?.postalOrZipCode ?? '',
    country: saved?.address?.country ?? '',
    emailAddress: saved?.address?.emailAddress ?? '',
    telephoneNumber: saved?.address?.telephoneNumber ?? ''
  })
}

const trimmedValues = (payload) =>
  Object.fromEntries(
    FIELD_ORDER.map((field) => [field, (payload[field] ?? '').trim()])
  )

const formErrors = (payload, values) => {
  const { errors } = validate(fields, payload)
  const merged = { ...missingMandatoryErrors(values), ...errors }
  return Object.fromEntries(
    FIELD_ORDER.filter((field) => merged[field]).map((field) => [
      field,
      merged[field]
    ])
  )
}

const privateTransporter = (values) => ({
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

const privateTransporterRecord = (values) => ({
  privateTransporter: privateTransporter(values)
})

/** Keep the transporter for the organisation as well as for the notification.
 *
 * A transporter that lives only on the notification it was typed into is typed
 * again on the next one, so the same record joins the organisation's own list
 * and the transporter list offers it from then on (design release 1). It goes
 * on as a private transporter that has not been approved yet, which is what the
 * organisation knows about it: nothing here has approved anything. */
const remember = (request, values) =>
  rememberTransporter(organisationIdOf(request), {
    ...privateTransporter(values),
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
