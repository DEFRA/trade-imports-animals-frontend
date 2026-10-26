import { TEMPLATES } from '../../config.js'
import * as state from '../../../../../../engine/index.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} from '../../../../../../lib/http-status.js'
import { hasErrors } from '../../../../../../lib/validate/index.js'
import * as kit from '../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../shared/copy.js'
import * as countries from '../../../../../../services/countries/index.js'
import * as importReasonPurpose from '../../../../../../services/import-reason-purpose/index.js'
import * as ports from '../../../../../../services/ports/index.js'
import { importReasonPage as page } from './page.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'
import {
  PURPOSE_FIELD,
  TEMPORARY_ADMISSION_DATE_FIELD,
  validation
} from './validate.js'

export const meta = {
  ...page,
  collects: [
    'reasonForImport',
    'purposeInInternalMarket',
    'destinationCountry',
    'portOfExit',
    'exitDate'
  ],
  validation
}
const view = `${TEMPLATES}/features/import-reason/template`

const copy = copyFor({ en, cy })

const countryItems = async () => [
  { value: '', text: copy.country.selectText },
  ...(await countries.countryAndSubdivisionOptionsNamedWithCountry())
]

const portItems = async () => [
  { value: '', text: copy.port.selectText },
  ...(await ports.portOptions())
]

const render = async (
  request,
  h,
  current,
  values,
  { errors = {}, recoverableError = false } = {}
) =>
  h.view(view, {
    ...kit.base(copy.title, {
      request,
      backLink: await kit.runBackLink(request, page.id, current),
      journey: current.journey,
      page,
      recoverableError
    }),
    copy,
    values,
    errors,
    errorSummary: kit.errorSummary(errors),
    reasonOptions: importReasonPurpose.reasons().map((option) => ({
      ...option,
      hint: { text: copy.reasonHints[option.value] },
      checked: option.value === values.reasonForImport
    })),
    purposeOptions: importReasonPurpose.purposes().map((option) => ({
      ...option,
      hint: { text: copy.purpose.hints[option.value] },
      checked: option.value === values[PURPOSE_FIELD]
    })),
    countryItems: await countryItems(),
    portItems: await portItems(),
    exitDateField: kit.dateField(TEMPORARY_ADMISSION_DATE_FIELD, {
      label: copy.date.label,
      labelClasses: '',
      formGroupClasses: 'govuk-!-margin-bottom-6',
      hint: copy.date.hint,
      value: values[TEMPORARY_ADMISSION_DATE_FIELD],
      error: errors[TEMPORARY_ADMISSION_DATE_FIELD]
    })
  })

const putStoredAnswersThroughPageRules = (answers) =>
  validation.onStored(answers)

const get = async (request, h) => {
  const current = await state.get(request, h)
  const { values, errors } = await putStoredAnswersThroughPageRules(
    current.answers
  )
  return render(request, h, current, values, { errors })
}

const post = async (request, h) => {
  const { values, answers, errors } = await validation.onSubmit(
    request.payload ?? {},
    { allowMissing: kit.isHubExit(request) }
  )
  if (hasErrors(errors)) {
    const current = await state.get(request, h)
    return (await render(request, h, current, values, { errors })).code(
      HTTP_STATUS_BAD_REQUEST
    )
  }

  const { value: committed, failure } = await kit.recoverableSave(
    request,
    () => state.commit(request, h, answers),
    async () => {
      const current = await state.get(request, h)
      return (
        await render(request, h, current, values, { recoverableError: true })
      ).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
    }
  )
  if (failure) {
    return failure
  }

  const { scope } = committed
  return h.redirect(await kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })
