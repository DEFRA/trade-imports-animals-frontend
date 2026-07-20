import { pagePath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import { compose, requiredOneOf, validate } from '../../lib/validate/index.js'
import { hasCommittedNotificationAnswers } from '../../flow/entry-guard.js'
import { nextRunTarget } from '../../flow/run.js'
import { beginOpeningRun, inOpeningRun } from '../../flow/run-state.js'
import * as kit from '../../shared/kit.js'
import { importTypeFilterPage as page } from './page.js'

export const meta = { ...page, collects: ['importType'] }
const view = `${TEMPLATES}/features/import-type-filter/template`
const holdingView = `${TEMPLATES}/features/import-type-filter/not-available`

export const LIVE_ANIMALS = 'live-animals'
export const NOT_AVAILABLE_SLUG = 'import-type/not-available'

const IMPORT_TYPES = [
  { value: LIVE_ANIMALS, text: 'Live animals or germinal products' },
  { value: 'poao', text: 'Products of animal origin or animal by-products' },
  { value: 'hrfnao', text: 'High-risk food or feed of non-animal origin' },
  { value: 'plants', text: 'Plants, plant products or other objects' }
]

const fields = compose(
  requiredOneOf(
    'importType',
    IMPORT_TYPES.map((type) => type.value),
    'Select what you are importing'
  )
)

const render = (h, values, errors = {}) =>
  h.view(view, {
    ...kit.base('What are you importing?', { backLink: pagePath('home') }),
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
    ...kit.base('You cannot use this service', {
      backLink: pagePath(page.slug)
    }),
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
