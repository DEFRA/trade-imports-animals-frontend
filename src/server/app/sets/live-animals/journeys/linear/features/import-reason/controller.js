import { hubPath } from '../../../../../../shared/paths.js'
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

const DIVIDER_OPTION = { value: '', text: '──────────', disabled: true }

const countryItems = async () => [
  { value: '', text: copy.country.placeholder },
  DIVIDER_OPTION,
  ...(await countries.originCountries())
]

const portItems = async () => [
  { value: '', text: copy.port.placeholder },
  DIVIDER_OPTION,
  ...(await ports.list()).map((port) => ({
    value: port.code,
    text: `${port.name} (${port.code})`
  }))
]

const render = async (
  h,
  journey,
  values,
  errors = {},
  recoverableError = false
) =>
  h.view(view, {
    ...kit.base(copy.title, {
      backLink: hubPath(journey.journeyId),
      journey,
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
      hint: copy.date.hint,
      value: values[TEMPORARY_ADMISSION_DATE_FIELD],
      error: errors[TEMPORARY_ADMISSION_DATE_FIELD]
    })
  })

// The stored answers go back through the page's own rules on the way in, so an
// answer the reference data has moved past is named here rather than surviving
// to the review page. A stale answer is blanked in every field it prefills —
// not only the one the current reason happens to reveal — so neither reveal
// can render it as chosen.
const get = async (request, h) => {
  const { journey, answers } = await state.get(request, h)
  const { values, errors } = await validation.onStored(answers)
  return render(h, journey, values, errors)
}

const post = async (request, h) => {
  const { values, answers, errors } = await validation.onSubmit(
    request.payload ?? {}
  )
  if (hasErrors(errors)) {
    const { journey } = await state.get(request, h)
    return (await render(h, journey, values, errors)).code(
      HTTP_STATUS_BAD_REQUEST
    )
  }

  let committed
  const { failure } = await kit.recoverableSave(
    async () => {
      committed = await state.commit(request, h, answers)
    },
    async () => {
      const { journey } = await state.get(request, h)
      return (await render(h, journey, values, {}, true)).code(
        HTTP_STATUS_INTERNAL_SERVER_ERROR
      )
    }
  )
  if (failure) {
    return failure
  }

  const { scope } = committed
  return h.redirect(await kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })
