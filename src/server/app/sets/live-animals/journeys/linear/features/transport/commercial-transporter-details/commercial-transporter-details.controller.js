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
import {
  commercialTransporterDetailsPage as page,
  transporterAddPage
} from '../page.js'
import {
  COMMERCIAL,
  COMMERCIAL_TRANSPORTER_COUNTRY_NAME,
  saveTransporter
} from '../../../../../../../services/transporters/index.js'
import { organisationIdOf } from '../../../../../../../../common/helpers/organisation-id.js'
import { saveTransporterDetails } from '../transporter-details-save.js'
import { redirectUnlessOwnTransporterType } from '../own-transporter-type.js'
import { storedEnteredTransporter } from '../transporter-add-session.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'

const view = `${TEMPLATES}/features/transport/commercial-transporter-details/commercial-transporter-details`

const bundle = copyFor({ en, cy })

const copy = bundle.commercialTransporterDetails

const guidance = bundle.transporters.guidance

const NORTHERN_IRELAND = COMMERCIAL_TRANSPORTER_COUNTRY_NAME

const MANDATORY_MESSAGES = {
  approvalNumber: copy.errors.approvalNumberRequired,
  nameOrOrganisationName: copy.errors.nameRequired,
  addressLine1: copy.errors.addressLine1Required,
  townOrCity: copy.errors.townOrCityRequired,
  postcode: copy.errors.postcodeRequired,
  email: copy.errors.emailRequired,
  phone: copy.errors.telephoneRequired
}

const FIELD_ORDER = [
  'approvalNumber',
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

const FIXED_FIELDS = ['country']

const ENTERED_FIELDS = FIELD_ORDER.filter(
  (field) => !FIXED_FIELDS.includes(field)
)

const RECORD_FIELDS = ['approvalNumber', 'nameOrOrganisationName']

const SAVED_ADDRESS_FIELDS = ENTERED_FIELDS.filter(
  (field) => !RECORD_FIELDS.includes(field)
)

const MAX_APPROVAL_NUMBER_LENGTH = 50
const MAX_NAME_LENGTH = 255
const MAX_TOWN_LENGTH = 100
const MAX_POSTCODE_LENGTH = 12
const MAX_PHONE_LENGTH = 20
const MAX_EMAIL_LENGTH = 254

const fields = compose(
  maxText(
    'approvalNumber',
    MAX_APPROVAL_NUMBER_LENGTH,
    copy.errors.approvalNumberMaxLength
  ),
  maxText('nameOrOrganisationName', MAX_NAME_LENGTH, copy.errors.nameMaxLength),
  maxText('addressLine1', MAX_NAME_LENGTH, copy.errors.addressLine1MaxLength),
  maxText('addressLine2', MAX_NAME_LENGTH, copy.errors.addressLine2MaxLength),
  maxText('townOrCity', MAX_TOWN_LENGTH, copy.errors.townOrCityMaxLength),
  maxText('county', MAX_TOWN_LENGTH, copy.errors.countyMaxLength),
  maxText('postcode', MAX_POSTCODE_LENGTH, copy.errors.postcodeMaxLength),
  oneOf('country', [NORTHERN_IRELAND], copy.errors.countryFixed),
  maxText('email', MAX_EMAIL_LENGTH, copy.errors.emailMaxLength),
  maxText('phone', MAX_PHONE_LENGTH, copy.errors.telephoneMaxLength)
)

const recordProvided = (values) =>
  ENTERED_FIELDS.some((field) => values[field] !== '')

const missingMandatoryErrors = (values) => {
  if (!recordProvided(values)) {
    return {}
  }
  return Object.fromEntries(
    Object.entries(MANDATORY_MESSAGES).filter(([field]) => values[field] === '')
  )
}

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
    guidance,
    country: NORTHERN_IRELAND,
    values,
    errors,
    errorSummary: kit.errorSummary(errors)
  })

const addressValues = (address) =>
  Object.fromEntries(
    SAVED_ADDRESS_FIELDS.map((field) => [field, address?.[field] ?? ''])
  )

const valuesOfSavedCommercialTransporter = (saved) => ({
  approvalNumber: saved?.approvalNumber ?? '',
  nameOrOrganisationName: saved?.name ?? '',
  ...addressValues(saved?.address)
})

const get = async (request, h) => {
  const redirect = await redirectUnlessOwnTransporterType(
    request,
    h,
    COMMERCIAL
  )
  if (redirect) {
    return redirect
  }
  const { journey, answers, flowOnlyAnswers } = await state.get(request, h)
  const values =
    storedEnteredTransporter(flowOnlyAnswers, COMMERCIAL) ??
    valuesOfSavedCommercialTransporter(answers.commercialTransporter)
  return render(request, h, journey, values)
}

const trimmedValues = (payload) =>
  Object.fromEntries(
    ENTERED_FIELDS.map((field) => [field, (payload[field] ?? '').trim()])
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

const commercialTransporterParty = (values) => ({
  name: values.nameOrOrganisationName,
  approvalNumber: values.approvalNumber,
  address: {
    addressLine1: values.addressLine1,
    addressLine2: values.addressLine2,
    townOrCity: values.townOrCity,
    county: values.county,
    postcode: values.postcode,
    country: NORTHERN_IRELAND,
    phone: values.phone,
    email: values.email
  }
})

const commercialTransporterRecord = (values) => ({
  commercialTransporter: commercialTransporterParty(values)
})

const remember = (request, values) =>
  saveTransporter(
    organisationIdOf(request),
    commercialTransporterParty(values),
    'COMMERCIAL'
  )

const post = saveTransporterDetails({
  transporterType: COMMERCIAL,
  trimmedValues,
  formErrors,
  recordProvided,
  record: commercialTransporterRecord,
  render,
  remember
})

export const routes = kit.pageRoutes(page, { get, post })
