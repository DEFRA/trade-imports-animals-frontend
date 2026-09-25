import * as state from '../../../../../../engine/index.js'
import { partiesForRender } from '../addresses/parties-for-render.js'
import { cardStoredErrors } from '../../flow/stored-answers.js'
import { REVIEW_CARDS } from './view-model/incomplete-cards.js'
import { outstandingPartyErrors } from './view-model/outstanding-parties.js'

/** Shared refusal predicate for the review page's Continue and the
 * declaration submit — a bookmark or back-button cannot sneak a stale
 * submission past. SUBMITTED notifications are never refused.
 */
export const isReviewRefused = async (request, h) => {
  const { journey, answers, storedAnswers, scope } = await state.get(request, h)
  if (journey.status === state.SUBMITTED) {
    return false
  }
  if (!scope.readyForCheckYourAnswers) {
    return true
  }
  const source = storedAnswers ?? answers
  const parties = await partiesForRender(request, journey, source)
  if (Object.keys(outstandingPartyErrors(source, parties)).length > 0) {
    return true
  }
  const invalidCardErrors = await cardStoredErrors(REVIEW_CARDS, answers, {
    request,
    storedAnswers
  })
  return Object.keys(invalidCardErrors).length > 0
}
