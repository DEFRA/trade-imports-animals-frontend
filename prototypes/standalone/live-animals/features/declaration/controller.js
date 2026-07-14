import { pagePath, TEMPLATES } from '../../config.js'
import { SUBMITTED } from '../../engine/persistence/records.js'
import * as state from '../../engine/index.js'
import { compose, requiredOneOf, validate } from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
import { confirmationPage } from '../confirmation/page.js'
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

const render = (h, journey, values, errors = {}) =>
  h.view(view, {
    ...kit.base('Declaration', {
      backLink: pagePath(kit.CYA_SLUG),
      journey
    }),
    heading: 'Declaration',
    declarationLabel: DECLARATION_LABEL,
    submissionDate: dateText(Date.now()),
    values,
    errors,
    errorSummary: kit.errorSummary(errors)
  })

const get = async (request, h) => {
  const { journey, answers } = await state.get(request, h)
  if (journey.status === SUBMITTED) {
    return h.redirect(pagePath(confirmationPage.slug))
  }
  return render(h, journey, { declaration: answers.declaration ?? '' })
}

const post = async (request, h) => {
  const { journey } = await state.get(request, h)
  if (journey.status === SUBMITTED) {
    return h.redirect(pagePath(confirmationPage.slug))
  }

  const payload = request.payload ?? {}
  const values = { declaration: payload.declaration ?? '' }
  const { errors } = validate(fields, payload)
  if (errors) return render(h, journey, values, errors)

  await state.commit(request, h, values)
  const result = await state.submitJourney(request, h)
  if (!result.ok) return h.redirect(pagePath(kit.CYA_SLUG))
  return h.redirect(pagePath(confirmationPage.slug))
}

export const routes = kit.pageRoutes(page, { get, post })
