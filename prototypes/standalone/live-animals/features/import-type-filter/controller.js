import { pagePath, TEMPLATES } from '../../config.js'
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

const render = (h, values, errors = {}) =>
  h.view(view, {
    ...kit.base(copy.title, { backLink: pagePath('home') }),
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
  const { answers } = await state.get(request, h)
  return render(h, { importType: answers.importType ?? '' })
}

const opensTheRun = async (request, answersBeforeCommit) =>
  (await inOpeningRun(request)) ||
  !hasCommittedNotificationAnswers(answersBeforeCommit)

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const values = { importType: payload.importType ?? '' }
  const { errors } = validate(fields, payload)
  if (errors) return render(h, values, errors)

  const { answers: before } = await state.get(request, h)
  const { scope } = await state.commit(request, h, values)
  if (values.importType !== LIVE_ANIMALS) {
    return h.redirect(pagePath(NOT_AVAILABLE_SLUG))
  }
  if (await opensTheRun(request, before)) {
    await beginOpeningRun(request, h)
    return h.redirect(kit.exitTarget(request, nextRunTarget(page.id, scope)))
  }
  return h.redirect(await kit.nextTarget(request, page, scope))
}

const getNotAvailable = (_request, h) =>
  h.view(holdingView, {
    ...kit.base(copy.notAvailable.title, {
      backLink: pagePath(page.slug)
    }),
    copy,
    changeAnswerHref: pagePath(page.slug)
  })

export const routes = [
  ...kit.pageRoutes(page, { get, post }),
  {
    method: 'GET',
    path: pagePath(NOT_AVAILABLE_SLUG),
    options: kit.open,
    handler: getNotAvailable
  }
]
