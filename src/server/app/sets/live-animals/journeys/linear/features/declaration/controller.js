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
import { isReviewRefused } from '../check-answers/refusal.js'
import { reviewHref } from '../check-answers/review-href.js'
import { reviewedConcurrencyToken as reviewedConcurrencyTokenOf } from '../check-answers/reviewed.js'

const STEP_REVIEW = 'review'
const STEP_DECLARE = 'declare'
const STALE_CONCURRENCY_TOKEN = 'STALE_CONCURRENCY_TOKEN'

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

// The reviewed token, not kit.base()'s current one, so a re-shown declaration
// still declares exactly what the review showed.
const render = (
  h,
  journey,
  reviewedConcurrencyToken,
  values,
  errors = {},
  recoverableError = false
) =>
  h.view(view, {
    ...kit.base(copy.title, {
      backLink: pagePath(journey.journeyId, kit.CYA_SLUG),
      journey,
      recoverableError
    }),
    concurrencyToken: reviewedConcurrencyToken,
    copy,
    submissionDate: dateText(Date.now()),
    values,
    errors,
    errorSummary: kit.errorSummary(errors)
  })

const postedConcurrencyToken = (payload) =>
  payload.concurrencyToken == null || payload.concurrencyToken === ''
    ? undefined
    : Number(payload.concurrencyToken)

const get = async (request, h) => {
  const { journey } = await state.get(request, h)
  if (journey.status === state.SUBMITTED) {
    return h.redirect(pagePath(journey.journeyId, confirmationPage.slug))
  }
  return h.redirect(reviewHref(journey.journeyId))
}

const declare = async (request, h, journey, reviewedConcurrencyToken) => {
  const payload = request.payload
  const values = { declaration: payload.declaration ?? '' }
  const { errors } = validate(fields, payload)
  if (errors) {
    return render(h, journey, reviewedConcurrencyToken, values, errors).code(
      HTTP_STATUS_BAD_REQUEST
    )
  }

  let result
  try {
    const { failure } = await kit.recoverableSave(
      async () => {
        await state.commit(request, h, values)
        result = await state.submitJourney(request, h, {
          concurrencyToken: reviewedConcurrencyToken
        })
      },
      () =>
        render(h, journey, reviewedConcurrencyToken, values, {}, true).code(
          HTTP_STATUS_INTERNAL_SERVER_ERROR
        )
    )
    if (failure) {
      return failure
    }
  } catch (error) {
    if (error?.code === STALE_CONCURRENCY_TOKEN) {
      return h.redirect(reviewHref(journey.journeyId, { changed: true }))
    }
    throw error
  }

  if (!result.ok) {
    return h.redirect(reviewHref(journey.journeyId, { refused: true }))
  }
  return h.redirect(pagePath(journey.journeyId, confirmationPage.slug))
}

const post = async (request, h) => {
  const { journey } = await state.get(request, h)
  if (journey.status === state.SUBMITTED) {
    return h.redirect(pagePath(journey.journeyId, confirmationPage.slug))
  }

  const payload = request.payload ?? {}
  if (payload.step !== STEP_REVIEW && payload.step !== STEP_DECLARE) {
    return h.redirect(reviewHref(journey.journeyId))
  }

  const reviewedConcurrencyToken = postedConcurrencyToken(payload)
  if (reviewedConcurrencyToken !== journey.concurrencyToken) {
    return h.redirect(reviewHref(journey.journeyId, { changed: true }))
  }
  if (
    reviewedConcurrencyToken !==
    (await reviewedConcurrencyTokenOf(request, journey.journeyId))
  ) {
    return h.redirect(reviewHref(journey.journeyId))
  }

  if (await isReviewRefused(request, h)) {
    return h.redirect(reviewHref(journey.journeyId, { refused: true }))
  }

  // Never pre-tick: a tick left by a submit refused as stale was given to older content.
  if (payload.step === STEP_REVIEW) {
    return render(h, journey, reviewedConcurrencyToken, { declaration: '' })
  }
  return declare(request, h, journey, reviewedConcurrencyToken)
}

export const routes = kit.pageRoutes(page, { get, post })
