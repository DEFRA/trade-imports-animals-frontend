import { session } from '../../../../../../engine/persistence/session.js'

/** The token this browser last rendered an editable review at, per journey.
 *
 * Every journey page carries the current token, so the posted token alone
 * cannot prove a declaration post came from the review — one copied off
 * another page would pass. Only the review writes this, so a declaration post
 * that matches it was rendered from a review of exactly that content. */
export const recordReviewed = (request, h, journey) =>
  session.setReviewedToken(
    h,
    journey.journeyId,
    journey.concurrencyToken,
    request
  )

export const reviewedToken = (request, journeyId) =>
  session.reviewedToken(request, journeyId)

export const forgetReviewed = (request, h, journeyId) =>
  session.setReviewedToken(h, journeyId, undefined, request)
