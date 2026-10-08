import { store } from '../../../../../../engine/store.js'
import { reviewedTokensCookie } from '../../../../../../engine/persistence/session.js'
import { postHandlerOf } from '../../../../../../engine/test-support.js'
import * as declaration from './controller.js'

/** The stub session state a review leaves behind for `journeyId` at `token`. */
export const reviewedState = (journeyId, token) => ({
  [reviewedTokensCookie()]: { [journeyId]: token }
})

/** A request as the review's Continue sends it: posting `step=review` at
 * `token`, from a browser whose session saw the review at `token`. */
export const continueRequest = (request, token, payload = {}) => ({
  ...request,
  payload: { step: 'review', concurrencyToken: `${token}`, ...payload },
  state: {
    ...request.state,
    ...reviewedState(request.params.journeyId, token)
  }
})

/** The declaration's routes as a trader reaches them: the "GET" posts the
 * review's Continue at the journey's current token, so a test that renders the
 * page by its GET handler sees the declaration rather than a redirect. */
export const declarationRoutesFromReview = [
  {
    method: 'GET',
    handler: async (request, h) => {
      const { concurrencyToken } = await store.get(request.params.journeyId)
      return postHandlerOf(declaration)(
        continueRequest(request, concurrencyToken),
        h
      )
    }
  }
]
