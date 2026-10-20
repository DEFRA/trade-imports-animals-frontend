import { dashboardPath, hubPath } from '../../../../../../shared/paths.js'
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
import { hasCommittedNotificationAnswers } from '../../flow/entry-guard.js'
import { originPage as page } from './page.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'
import {
  prefixFor,
  REGION_CODE_SUFFIX_MAX_LENGTH,
  validation
} from './validate.js'

export const meta = {
  ...page,
  collects: [
    'countryOfOrigin',
    'countryOfOriginSubdivisionCode',
    'regionOfOriginCodeRequirement',
    'regionOfOriginCode',
    'internalReferenceNumber'
  ],
  validation
}
const view = `${TEMPLATES}/features/origin/template`

const copy = copyFor({ en, cy })

const countryItems = async () => [
  { value: '', text: copy.country.selectText },
  ...(await countries.countryAndSubdivisionOptionsNamedWithCountry())
]

const backLinkFor = (journey, answers) =>
  hasCommittedNotificationAnswers(answers)
    ? hubPath(journey.journeyId)
    : dashboardPath()

const render = async (
  h,
  journey,
  values,
  { errors = {}, answers = values, recoverableError = false } = {}
) =>
  h.view(view, {
    ...kit.base(copy.title, {
      request: h.request,
      backLink: backLinkFor(journey, answers),
      journey,
      page,
      recoverableError
    }),
    copy,
    values,
    errors,
    errorSummary: kit.errorSummary(errors),
    countryItems: await countryItems(),
    regionCodePrefix: prefixFor(values.countryOfOrigin),
    regionCodeSuffixMaxLength: REGION_CODE_SUFFIX_MAX_LENGTH
  })

const get = async (request, h) => {
  const { journey, answers } = await state.get(request, h)
  const { values, errors } = await validation.onStored(answers)
  return render(h, journey, values, { errors, answers })
}

const post = async (request, h) => {
  const { values, answers, errors } = await validation.onSubmit(
    request.payload ?? {},
    { allowMissing: kit.isHubExit(request) }
  )
  if (hasErrors(errors)) {
    const { journey, answers: storedAnswers } = await state.get(request, h)
    return (
      await render(h, journey, values, { errors, answers: storedAnswers })
    ).code(HTTP_STATUS_BAD_REQUEST)
  }

  let committed
  const { failure } = await kit.recoverableSave(
    async () => {
      committed = await state.commit(request, h, answers)
    },
    async () => {
      const { journey, answers: storedAnswers } = await state.get(request, h)
      return (
        await render(h, journey, values, {
          answers: storedAnswers,
          recoverableError: true
        })
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
