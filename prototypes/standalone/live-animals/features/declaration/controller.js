import { pagePath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import { compose, requiredOneOf, validate } from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
import { copyFor } from '../../shared/copy.js'
import { confirmationPage } from '../confirmation/page.js'
import { declarationPage as page } from './page.js'
import { copy as en } from './copy.en.js'
import { copy as cy } from './copy.cy.js'

export const meta = { ...page, collects: ['declaration'] }
const view = `${TEMPLATES}/features/declaration/template`

const copy = copyFor({ en, cy })

const HTTP_STATUS_BAD_REQUEST = 400

const fields = compose(
  requiredOneOf('declaration', ['confirmed'], copy.errors.declarationRequired)
)

const dateText = (value) =>
  new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

const render = (h, journey, values, errors = {}) =>
  h.view(view, {
    ...kit.base(copy.title, {
      backLink: pagePath(kit.CYA_SLUG),
      journey
    }),
    copy,
    submissionDate: dateText(Date.now()),
    values,
    errors,
    errorSummary: kit.errorSummary(errors)
  })

const get = async (request, h) => {
  const { journey, answers } = await state.get(request, h)
  if (journey.status === state.SUBMITTED) {
    return h.redirect(pagePath(confirmationPage.slug))
  }
  return render(h, journey, { declaration: answers.declaration ?? '' })
}

const post = async (request, h) => {
  const { journey } = await state.get(request, h)
  if (journey.status === state.SUBMITTED) {
    return h.redirect(pagePath(confirmationPage.slug))
  }

  const payload = request.payload ?? {}
  const values = { declaration: payload.declaration ?? '' }
  const { errors } = validate(fields, payload)
  if (errors) {
    return render(h, journey, values, errors).code(HTTP_STATUS_BAD_REQUEST)
  }

  await state.commit(request, h, values)
  const result = await state.submitJourney(request, h)
  if (!result.ok) return h.redirect(pagePath(kit.CYA_SLUG))
  return h.redirect(pagePath(confirmationPage.slug))
}

export const routes = kit.pageRoutes(page, { get, post })
