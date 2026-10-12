import { session } from '../../../../../../engine/persistence/session.js'

// Every journey page carries the current token, so a posted token alone cannot
// prove the post came from the review. Only the review records this one.
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
