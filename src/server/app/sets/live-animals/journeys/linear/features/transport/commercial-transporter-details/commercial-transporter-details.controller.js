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
  NEW,
  rememberTransporter
} from '../../../../../../../services/transporters/index.js'
import { organisationIdOf } from '../../../../../../../../common/helpers/organisation-id.js'
import { saveTransporterDetails } from '../transporter-details-save.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'

/** The commercial arm of the add route.
 *
 * A spoke off the type chooser rather than a step in the journey: the
 * `commercialTransporter` it writes is declared by the transporter list, which
 * is where a trader normally answers it by picking a row. This is the way out
 * for a trader whose commercial transporter is not on that list — they give
 * its authorisation number, name, address and contact details by hand
 * (design release 1). */
const view = `${TEMPLATES}/features/transport/commercial-transporter-details/commercial-transporter-details`

const bundle = copyFor({ en, cy })

const copy = bundle.commercialTransporterDetails

/** The authorisation rules the transporter list states, repeated at the top of
 * this form as design release 1 repeats them: one set of sentences shown in
 * two places rather than two copies of the same rules to keep in step. */
const guidance = bundle.transporters.guidance

/** The country of a hand-added commercial transporter, which design release 1
 * fixes rather than asks: the restriction the type chooser states on the
 * Commercial option. Stored in English whatever the page is read in, because
 * it is an answer on the notification and not display text. */
const NORTHERN_IRELAND = 'Northern Ireland'

const MANDATORY_MESSAGES = {
  approvalNumber: copy.errors.approvalNumberRequired,
  nameOrOrganisationName: copy.errors.nameRequired,
  addressLine1: copy.errors.addressLine1Required,
  townOrCity: copy.errors.townOrCityRequired,
  postcode: copy.errors.postcodeRequired,
  email: copy.errors.emailRequired,
  phone: copy.errors.telephoneRequired
}

/** The fields the page shows, in the order it asks for them — the order the
 * error summary lists them in too. */
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

/** The country is fixed rather than typed, so it is the one field of the order
 * that is neither trimmed off the payload nor counted as the trader having
 * begun a record. */
const FIXED_FIELDS = ['country']

const ENTERED_FIELDS = FIELD_ORDER.filter(
  (field) => !FIXED_FIELDS.includes(field)
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
  // The form posts the fixed country back in a hidden field, so a value that
  // is not Northern Ireland has been tampered with: refuse it rather than
  // quietly correcting it.
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

const get = async (request, h) => {
  const { journey, answers } = await state.get(request, h)
  const saved = answers.commercialTransporter
  return render(request, h, journey, {
    approvalNumber: saved?.approvalNumber ?? '',
    nameOrOrganisationName: saved?.name ?? '',
    addressLine1: saved?.address?.addressLine1 ?? '',
    addressLine2: saved?.address?.addressLine2 ?? '',
    townOrCity: saved?.address?.townOrCity ?? '',
    county: saved?.address?.county ?? '',
    postcode: saved?.address?.postcode ?? '',
    email: saved?.address?.email ?? '',
    phone: saved?.address?.phone ?? ''
  })
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

/** Keep the transporter for the organisation as well as for the notification.
 *
 * A transporter that lives only on the notification it was typed into is typed
 * again on the next one, so the same record joins the organisation's own list
 * and the transporter list offers it from then on (design release 1). It goes
 * on as a commercial transporter that has not been approved yet, which is what
 * the organisation knows about it: nothing here has approved anything. */
const remember = (request, values) =>
  rememberTransporter(organisationIdOf(request), {
    ...commercialTransporterParty(values),
    type: COMMERCIAL,
    status: NEW
  })

const post = saveTransporterDetails({
  trimmedValues,
  formErrors,
  recordProvided,
  record: commercialTransporterRecord,
  render,
  remember
})

export const routes = kit.pageRoutes(page, { get, post })
