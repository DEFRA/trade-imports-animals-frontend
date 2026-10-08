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

/** Every render carries `reviewedToken` — the token the review was rendered
 * with — rather than `kit.base()`'s current one, so a re-shown declaration
 * still declares exactly what the review showed. */
const render = (
  h,
  journey,
  reviewedToken,
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
    concurrencyToken: reviewedToken,
    copy,
    submissionDate: dateText(Date.now()),
    values,
    errors,
    errorSummary: kit.errorSummary(errors)
  })

const postedToken = (payload) =>
  payload.concurrencyToken == null || payload.concurrencyToken === ''
    ? undefined
    : Number(payload.concurrencyToken)

// The declaration is reached only by posting from the review, so a bookmark or
// typed URL goes back to the review.
const get = async (request, h) => {
  const { journey } = await state.get(request, h)
  if (journey.status === state.SUBMITTED) {
    return h.redirect(pagePath(journey.journeyId, confirmationPage.slug))
  }
  return h.redirect(reviewHref(journey.journeyId))
}

const declare = async (request, h, journey, reviewedToken) => {
  const payload = request.payload
  const values = { declaration: payload.declaration ?? '' }
  const { errors } = validate(fields, payload)
  if (errors) {
    return render(h, journey, reviewedToken, values, errors).code(
      HTTP_STATUS_BAD_REQUEST
    )
  }

  let result
  try {
    const { failure } = await kit.recoverableSave(
      async () => {
        await state.commit(request, h, values)
        result = await state.submitJourney(request, h, {
          concurrencyToken: reviewedToken
        })
      },
      () =>
        render(h, journey, reviewedToken, values, {}, true).code(
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
  const { journey, answers } = await state.get(request, h)
  if (journey.status === state.SUBMITTED) {
    return h.redirect(pagePath(journey.journeyId, confirmationPage.slug))
  }

  const payload = request.payload ?? {}
  if (payload.step !== STEP_REVIEW && payload.step !== STEP_DECLARE) {
    return h.redirect(reviewHref(journey.journeyId))
  }

  const reviewedToken = postedToken(payload)
  if (reviewedToken !== journey.concurrencyToken) {
    return h.redirect(reviewHref(journey.journeyId, { changed: true }))
  }

  if (await isReviewRefused(request, h)) {
    return h.redirect(reviewHref(journey.journeyId, { refused: true }))
  }

  if (payload.step === STEP_REVIEW) {
    return render(h, journey, reviewedToken, {
      declaration: answers.declaration ?? ''
    })
  }
  return declare(request, h, journey, reviewedToken)
}

export const routes = kit.pageRoutes(page, { get, post })
