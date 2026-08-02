import * as state from '../../../../../../engine/index.js'
import {
  beginOpeningRun,
  inOpeningRun
} from '../../../../../../flow/run-state.js'
import { HTTP_STATUS_BAD_REQUEST } from '../../../../../../lib/http-status.js'
import { HTTP_STATUS_INTERNAL_SERVER_ERROR } from '../../../../../../lib/http-status.js'
import {
  compose,
  requiredOneOf,
  validate
} from '../../../../../../lib/validate/index.js'
import {
  dashboardPath,
  pagePath,
  pageRoutePath
} from '../../../../../../shared/paths.js'
import { copyFor } from '../../../../../../shared/copy.js'
import * as kit from '../../../../../../shared/kit.js'
import { TEMPLATES } from '../../config.js'
import { hasCommittedNotificationAnswers } from '../../flow/entry-guard.js'
import { nextRunTarget } from '../../flow/run.js'
import { copy as cy } from './copy/copy.cy.js'
import { copy as en } from './copy/copy.en.js'
import { importTypePage as page } from './page.js'

export const meta = { ...page, collects: ['importType'] }
export const PLANT_PRODUCTS = 'plants'
export const NOT_AVAILABLE_SLUG = 'import-type/not-available'

const view = `${TEMPLATES}/features/import-type/template`
const holdingView = `${TEMPLATES}/features/import-type/not-available`
const copy = copyFor({ en, cy })

const IMPORT_TYPES = ['live-animals', 'poao', 'hrfnao', PLANT_PRODUCTS].map(
  (value) => ({ value, text: copy.importTypes[value] })
)

const fields = compose(
  requiredOneOf(
    'importType',
    IMPORT_TYPES.map(({ value }) => value),
    copy.errors.importTypeRequired
  )
)

const render = (h, journey, values, errors = {}, recoverableError = false) =>
  h.view(view, {
    ...kit.base(copy.title, {
      backLink: dashboardPath(),
      journeyId: journey.journeyId,
      recoverableError
    }),
    copy,
    values,
    errors,
    errorSummary: kit.errorSummary(errors),
    importTypeOptions: IMPORT_TYPES.map((type) => ({
      ...type,
      checked: type.value === values.importType
    }))
  })

const get = async (request, h) => {
  const { journey, answers } = await state.get(request, h)
  return render(h, journey, { importType: answers.importType ?? '' })
}

const shouldOpenRun = async (request, answersBeforeCommit) =>
  (await inOpeningRun(request, request.params.journeyId)) ||
  !hasCommittedNotificationAnswers(answersBeforeCommit)

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const values = { importType: payload.importType ?? '' }
  const { errors } = validate(fields, payload)
  if (errors) {
    const { journey } = await state.get(request, h)
    return render(h, journey, values, errors).code(HTTP_STATUS_BAD_REQUEST)
  }

  const { answers: before, journey } = await state.get(request, h)
  const { failure, value: committed } = await kit.recoverableSave(
    () => state.commit(request, h, values),
    () =>
      render(h, journey, values, {}, true).code(
        HTTP_STATUS_INTERNAL_SERVER_ERROR
      )
  )
  if (failure) return failure

  if (values.importType !== PLANT_PRODUCTS) {
    return h.redirect(pagePath(journey.journeyId, NOT_AVAILABLE_SLUG))
  }
  if (await shouldOpenRun(request, before)) {
    await beginOpeningRun(request, h, journey.journeyId)
    return h.redirect(
      kit.exitTarget(
        request,
        nextRunTarget(page.id, committed.scope, journey.journeyId)
      )
    )
  }
  return h.redirect(await kit.nextTarget(request, page, committed.scope))
}

const getNotAvailable = async (request, h) => {
  const { journey } = await state.get(request, h)
  const changeAnswerHref = pagePath(journey.journeyId, page.slug)
  return h.view(holdingView, {
    ...kit.base(copy.notAvailable.title, {
      backLink: changeAnswerHref,
      journeyId: journey.journeyId
    }),
    copy,
    changeAnswerHref
  })
}

export const routes = [
  ...kit.pageRoutes(page, { get, post }),
  {
    method: 'GET',
    path: pageRoutePath(NOT_AVAILABLE_SLUG),
    options: kit.routeOptions,
    handler: getNotAvailable
  }
]
