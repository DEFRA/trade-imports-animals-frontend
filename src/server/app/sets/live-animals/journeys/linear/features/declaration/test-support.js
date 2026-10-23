import { store } from '../../../../../../engine/store.js'
import { reviewedConcurrencyTokensCookie } from '../../../../../../engine/persistence/session.js'
import { postHandlerOf } from '../../../../../../engine/test-support.js'
import * as declaration from './controller.js'

export const reviewedState = (journeyId, token) => ({
  [reviewedConcurrencyTokensCookie()]: { [journeyId]: token }
})

export const continueRequest = (request, token, payload = {}) => ({
  ...request,
  payload: { step: 'review', concurrencyToken: `${token}`, ...payload },
  state: {
    ...request.state,
    ...reviewedState(request.params.journeyId, token)
  }
})

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
