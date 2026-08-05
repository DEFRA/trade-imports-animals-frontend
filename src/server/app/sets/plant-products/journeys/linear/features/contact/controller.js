import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} from '../../../../../../lib/http-status.js'
import {
  maxText,
  pattern,
  requiredText,
  validate
} from '../../../../../../lib/validate/index.js'
import * as state from '../../../../../../engine/index.js'
import { copyFor } from '../../../../../../shared/copy.js'
import * as kit from '../../../../../../shared/kit.js'
import { hubPath } from '../../../../../../shared/paths.js'
import { TEMPLATES } from '../../config.js'
import { copy as cy } from './copy/copy.cy.js'
import { copy as en } from './copy/copy.en.js'
import { contactDetailsPage as page } from './page.js'

export const meta = {
  ...page,
  collects: [
    'responsiblePersonName',
    'responsiblePersonEmail',
    'responsiblePersonTelephone'
  ]
}

const view = `${TEMPLATES}/features/contact/template`
const copy = copyFor({ en, cy })
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@.]+$/
const TELEPHONE = /^\+?[\d\s]+$/
const MAX_NAME_LENGTH = 32
const MAX_EMAIL_LENGTH = 255
const MAX_TELEPHONE_LENGTH = 30

const fieldRules = () => [
  requiredText('responsiblePersonName', copy.errors.nameRequired),
  maxText('responsiblePersonName', MAX_NAME_LENGTH, copy.errors.nameMax),
  pattern('responsiblePersonEmail', EMAIL, copy.errors.emailFormat),
  maxText('responsiblePersonEmail', MAX_EMAIL_LENGTH, copy.errors.emailMax),
  pattern('responsiblePersonTelephone', TELEPHONE, copy.errors.telephoneFormat),
  maxText(
    'responsiblePersonTelephone',
    MAX_TELEPHONE_LENGTH,
    copy.errors.telephoneMax
  )
]

const validateFields = (payload) => {
  const results = fieldRules().map((rule) => validate(rule, payload))
  const errors = results.reduce((combined, result) => {
    for (const [field, message] of Object.entries(result.errors ?? {})) {
      if (combined[field] === undefined) {
        combined[field] = message
      }
    }
    return combined
  }, {})
  return Object.keys(errors).length > 0 ? errors : null
}

const valuesFrom = (source) => ({
  responsiblePersonName: source.responsiblePersonName ?? '',
  responsiblePersonEmail: source.responsiblePersonEmail ?? '',
  responsiblePersonTelephone: source.responsiblePersonTelephone ?? ''
})

const render = (h, journey, values, errors = {}, recoverableError = false) =>
  h.view(view, {
    ...kit.base(copy.title, {
      backLink: hubPath(journey.journeyId),
      journey,
      recoverableError
    }),
    copy,
    values,
    errors,
    errorSummary: kit.errorSummary(errors)
  })

const get = async (request, h) => {
  const { journey, answers } = await state.get(request, h)
  return render(h, journey, valuesFrom(answers))
}

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const rawValues = valuesFrom(payload)
  const fieldErrors = validateFields(payload)
  const neitherContactMethod =
    !rawValues.responsiblePersonEmail.trim() &&
    !rawValues.responsiblePersonTelephone.trim()
  const errors = neitherContactMethod
    ? {
        ...(fieldErrors ?? {}),
        responsiblePersonEmail: copy.errors.emailOrTelephoneRequired
      }
    : fieldErrors

  if (errors) {
    const { journey } = await state.get(request, h)
    return render(h, journey, rawValues, errors).code(HTTP_STATUS_BAD_REQUEST)
  }

  const cleaned = {
    responsiblePersonName: rawValues.responsiblePersonName.trim(),
    ...(rawValues.responsiblePersonEmail.trim()
      ? { responsiblePersonEmail: rawValues.responsiblePersonEmail.trim() }
      : {}),
    ...(rawValues.responsiblePersonTelephone.trim()
      ? {
          responsiblePersonTelephone:
            rawValues.responsiblePersonTelephone.trim()
        }
      : {})
  }
  let committed
  const { failure } = await kit.recoverableSave(
    async () => {
      committed = await state.commit(request, h, cleaned)
    },
    async () => {
      const { journey } = await state.get(request, h)
      return render(h, journey, rawValues, {}, true).code(
        HTTP_STATUS_INTERNAL_SERVER_ERROR
      )
    }
  )
  if (failure) {
    return failure
  }

  return h.redirect(await kit.nextTarget(request, page, committed.scope))
}

export const routes = kit.pageRoutes(page, { get, post })
