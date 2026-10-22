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

export const DECLARATION_REFUSAL = Object.freeze({
  alreadySubmitted: 'already-submitted',
  unknownStep: 'unknown-step',
  changedSinceReview: 'changed-since-review',
  reviewNotRecorded: 'review-not-recorded',
  reviewRefused: 'review-refused',
  notReadyToSubmit: 'not-ready-to-submit'
})

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

const render = (
  h,
  journey,
  reviewedConcurrencyToken,
  values,
  { errors = {}, recoverableError = false } = {}
) =>
  h.view(view, {
    ...kit.base(copy.title, {
      backLink: pagePath(journey.journeyId, kit.CYA_SLUG),
      journey,
      showJourneyStrip: false,
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

const logRefusalAndRedirect = (request, h, { journey, refusal, target }) => {
  request.logger.info(
    {
      journeyId: journey.journeyId,
      refusal,
      concurrencyToken: journey.concurrencyToken,
      postedConcurrencyToken: postedConcurrencyToken(request.payload ?? {})
    },
    'Declaration refused'
  )
  return h.redirect(target)
}

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
    return render(h, journey, reviewedConcurrencyToken, values, {
      errors
    }).code(HTTP_STATUS_BAD_REQUEST)
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
        render(h, journey, reviewedConcurrencyToken, values, {
          recoverableError: true
        }).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
    )
    if (failure) {
      return failure
    }
  } catch (error) {
    if (error?.code === STALE_CONCURRENCY_TOKEN) {
      return logRefusalAndRedirect(request, h, {
        journey,
        refusal: DECLARATION_REFUSAL.changedSinceReview,
        target: reviewHref(journey.journeyId, { changed: true })
      })
    }
    throw error
  }

  if (!result.ok) {
    return logRefusalAndRedirect(request, h, {
      journey,
      refusal: DECLARATION_REFUSAL.notReadyToSubmit,
      target: reviewHref(journey.journeyId, { refused: true })
    })
  }
  return h.redirect(pagePath(journey.journeyId, confirmationPage.slug))
}

const post = async (request, h) => {
  const { journey } = await state.get(request, h)
  if (journey.status === state.SUBMITTED) {
    return logRefusalAndRedirect(request, h, {
      journey,
      refusal: DECLARATION_REFUSAL.alreadySubmitted,
      target: pagePath(journey.journeyId, confirmationPage.slug)
    })
  }

  const payload = request.payload ?? {}
  if (payload.step !== STEP_REVIEW && payload.step !== STEP_DECLARE) {
    return logRefusalAndRedirect(request, h, {
      journey,
      refusal: DECLARATION_REFUSAL.unknownStep,
      target: reviewHref(journey.journeyId)
    })
  }

  const reviewedConcurrencyToken = postedConcurrencyToken(payload)
  if (reviewedConcurrencyToken !== journey.concurrencyToken) {
    return logRefusalAndRedirect(request, h, {
      journey,
      refusal: DECLARATION_REFUSAL.changedSinceReview,
      target: reviewHref(journey.journeyId, { changed: true })
    })
  }
  if (
    reviewedConcurrencyToken !==
    (await reviewedConcurrencyTokenOf(request, journey.journeyId))
  ) {
    return logRefusalAndRedirect(request, h, {
      journey,
      refusal: DECLARATION_REFUSAL.reviewNotRecorded,
      target: reviewHref(journey.journeyId)
    })
  }

  if (await isReviewRefused(request, h)) {
    return logRefusalAndRedirect(request, h, {
      journey,
      refusal: DECLARATION_REFUSAL.reviewRefused,
      target: reviewHref(journey.journeyId, { refused: true })
    })
  }

  if (payload.step === STEP_REVIEW) {
    return render(h, journey, reviewedConcurrencyToken, {
      declaration: ''
    })
  }
  return declare(request, h, journey, reviewedConcurrencyToken)
}

export const routes = kit.pageRoutes(page, { get, post })
