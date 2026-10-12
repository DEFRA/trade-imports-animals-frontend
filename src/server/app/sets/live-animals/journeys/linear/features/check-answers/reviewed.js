import { session } from '../../../../../../engine/persistence/session.js'

// Every journey page carries the current token, so a posted token alone cannot
// prove the post came from the review. Only the review records this one.
export const recordReviewed = (request, h, journey) =>
  session.setReviewedConcurrencyToken(
    h,
    journey.journeyId,
    journey.concurrencyToken,
    request
  )

export const reviewedConcurrencyToken = (request, journeyId) =>
  session.reviewedConcurrencyToken(request, journeyId)
