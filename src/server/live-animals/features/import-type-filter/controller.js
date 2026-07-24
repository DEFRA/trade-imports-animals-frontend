import { BASE, pagePath, pageRoutePath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import { compose, requiredOneOf, validate } from '../../lib/validate/index.js'
import { hasCommittedNotificationAnswers } from '../../flow/entry-guard.js'
import { nextRunTarget } from '../../flow/run.js'
import { beginOpeningRun, inOpeningRun } from '../../flow/run-state.js'
import * as kit from '../../shared/kit.js'
import { copyFor } from '../../shared/copy.js'
import { importTypeFilterPage as page } from './page.js'
import { copy as en } from './copy.en.js'
import { copy as cy } from './copy.cy.js'

export const meta = { ...page, collects: ['importType'] }
const view = `${TEMPLATES}/features/import-type-filter/template`
const holdingView = `${TEMPLATES}/features/import-type-filter/not-available`

export const LIVE_ANIMALS = 'live-animals'
export const NOT_AVAILABLE_SLUG = 'import-type/not-available'

const copy = copyFor({ en, cy })

const IMPORT_TYPES = [LIVE_ANIMALS, 'poao', 'hrfnao', 'plants'].map(
  (value) => ({ value, text: copy.importTypes[value] })
)

const fields = compose(
  requiredOneOf(
    'importType',
    IMPORT_TYPES.map((type) => type.value),
    copy.errors.importTypeRequired
  )
)

const render = (h, journey, values, errors = {}) =>
  h.view(view, {
    ...kit.base(copy.title, {
      backLink: `${BASE}/home`,
      journeyId: journey.journeyId
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
    return render(h, journey, values, errors)
  }

  const { answers: before } = await state.get(request, h)
  const { scope } = await state.commit(request, h, values)
  if (values.importType !== LIVE_ANIMALS) {
    return h.redirect(pagePath(request.params.journeyId, NOT_AVAILABLE_SLUG))
  }
  if (await shouldOpenRun(request, before)) {
    await beginOpeningRun(request, h, request.params.journeyId)
    return h.redirect(
      kit.exitTarget(
        request,
        nextRunTarget(page.id, scope, request.params.journeyId)
      )
    )
  }
  return h.redirect(await kit.nextTarget(request, page, scope))
}

const getNotAvailable = async (request, h) => {
  const { journey } = await state.get(request, h)
  return h.view(holdingView, {
    ...kit.base(copy.notAvailable.title, {
      backLink: pagePath(journey.journeyId, page.slug),
      journeyId: journey.journeyId
    }),
    copy,
    changeAnswerHref: pagePath(journey.journeyId, page.slug)
  })
}

export const routes = [
  ...kit.pageRoutes(page, { get, post }),
  {
    method: 'GET',
    path: pageRoutePath(NOT_AVAILABLE_SLUG),
    options: kit.open,
    handler: getNotAvailable
  }
]
