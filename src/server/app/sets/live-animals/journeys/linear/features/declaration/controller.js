import { pagePath } from '../../../../../../shared/paths.js'
import { TEMPLATES } from '../../config.js'
import * as state from '../../../../../../engine/index.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} from '../../../../../../lib/http-status.js'
import {
  compose,
  requiredOneOf,
  validate
} from '../../../../../../lib/validate/index.js'
import * as kit from '../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../shared/copy.js'
import { confirmationPage } from '../confirmation/page.js'
import { declarationPage as page } from './page.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'
import { assembleFulfilments } from '../../../../../../bridge/assemble-fulfilments.js'
import { records } from '../../../../../../engine/persistence/records.js'
import { buildActor } from '../../../../../../../common/helpers/actor-helpers.js'
import { reinflatePartyAnswers } from '../addresses/reinflate-party-answers.js'

export const meta = { ...page, collects: ['declaration'] }
const view = `${TEMPLATES}/features/declaration/template`

const copy = copyFor({ en, cy })

const fields = compose(
  requiredOneOf('declaration', ['confirmed'], copy.errors.declarationRequired)
)

const dateText = (value) =>
  new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

const render = (h, journey, values, errors = {}, recoverableError = false) =>
  h.view(view, {
    ...kit.base(copy.title, {
      backLink: pagePath(journey.journeyId, kit.CYA_SLUG),
      journey,
      recoverableError
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
    return h.redirect(pagePath(journey.journeyId, confirmationPage.slug))
  }
  return render(h, journey, { declaration: answers.declaration ?? '' })
}

const post = async (request, h) => {
  const { journey } = await state.get(request, h)
  if (journey.status === state.SUBMITTED) {
    return h.redirect(pagePath(journey.journeyId, confirmationPage.slug))
  }

  const payload = request.payload ?? {}
  const values = { declaration: payload.declaration ?? '' }
  const { errors } = validate(fields, payload)
  if (errors) {
    return render(h, journey, values, errors).code(HTTP_STATUS_BAD_REQUEST)
  }

  let result
  const { failure } = await kit.recoverableSave(
    async () => {
      await state.commit(request, h, values)
      const current = await state.get(request, h)
      const actor = buildActor(request.auth.credentials)
      const inflatedAnswers = await reinflatePartyAnswers(
        request,
        current.answers
      )
      await records.replaceFulfilment(
        current.journey.journeyId,
        assembleFulfilments(inflatedAnswers),
        { known: current.journey, actor }
      )
      result = await state.submitJourney(request, h)
    },
    () =>
      render(h, journey, values, {}, true).code(
        HTTP_STATUS_INTERNAL_SERVER_ERROR
      )
  )
  if (failure) {
    return failure
  }

  if (!result.ok) {
    return h.redirect(pagePath(journey.journeyId, kit.CYA_SLUG))
  }
  return h.redirect(pagePath(journey.journeyId, confirmationPage.slug))
}

export const routes = kit.pageRoutes(page, { get, post })
