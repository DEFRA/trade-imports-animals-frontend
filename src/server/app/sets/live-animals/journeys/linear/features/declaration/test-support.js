import { store } from '../../../../../../engine/store.js'
import { postHandlerOf } from '../../../../../../engine/test-support.js'
import * as declaration from './controller.js'

/** The declaration's routes as a trader reaches them: the "GET" posts the
 * review's Continue at the journey's current token, so a test that renders the
 * page by its GET handler sees the declaration rather than a redirect. */
export const declarationRoutesFromReview = [
  {
    method: 'GET',
    handler: async (request, h) => {
      const { concurrencyToken } = await store.get(request.params.journeyId)
      return postHandlerOf(declaration)(
        {
          ...request,
          payload: { step: 'review', concurrencyToken: `${concurrencyToken}` }
        },
        h
      )
    }
  }
]
