import { session } from '../../../../../../engine/persistence/session.js'

export const recordReviewed = (request, h, journey) =>
  session.setReviewedConcurrencyToken(
    h,
    journey.journeyId,
    journey.concurrencyToken,
    request
  )

export const reviewedConcurrencyToken = (request, journeyId) =>
  session.reviewedConcurrencyToken(request, journeyId)
