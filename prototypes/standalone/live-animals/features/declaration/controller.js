import { pagePath, TEMPLATES } from '../../config.js'
import { SUBMITTED } from '../../engine/persistence/records.js'
import * as state from '../../engine/index.js'
import { compose, requiredOneOf, validate } from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
import { declarationPage as page } from './page.js'
import { obligations } from './obligations.js'

export const meta = { ...page, collects: kit.collectsFrom(obligations) }
const view = `${TEMPLATES}/features/declaration/template`

export const DECLARATION_LABEL =
  'I declare that the information I have provided in this notification I am submitting is true and correct.'

const fields = compose(
  requiredOneOf(
    'declaration',
    ['confirmed'],
    'Confirm that the information is true and correct before submitting'
  )
)

const dateText = (value) =>
  new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

const render = (h, values, errors = {}) =>
  h.view(view, {
    ...kit.base('Declaration', { backLink: pagePath(kit.CYA_SLUG) }),
    heading: 'Declaration',
    submitted: false,
    declarationLabel: DECLARATION_LABEL,
    submissionDate: dateText(Date.now()),
    values,
    errors,
    errorSummary: kit.errorSummary(errors)
  })

const renderSubmitted = (h, journey) =>
  h.view(view, {
    ...kit.base('Notification submitted'),
    submitted: true,
    submissionDate: dateText(journey.submittedAt),
    returnHref: pagePath('home')
  })

const get = async (request, h) => {
  const { journey, answers } = await state.get(request, h)
  if (journey.status === SUBMITTED) return renderSubmitted(h, journey)
  return render(h, { declaration: answers.declaration ?? '' })
}

const post = async (request, h) => {
  const { journey } = await state.get(request, h)
  if (journey.status === SUBMITTED) return h.redirect(pagePath(page.slug))

  const payload = request.payload ?? {}
  const values = { declaration: payload.declaration ?? '' }
  const { errors } = validate(fields, payload)
  if (errors) return render(h, values, errors)

  await state.commit(request, h, values)
  const result = await state.submitJourney(request, h)
  if (!result.ok) return h.redirect(pagePath(kit.CYA_SLUG))
  return h.redirect(pagePath(page.slug))
}

export const routes = kit.pageRoutes(page, { get, post })
