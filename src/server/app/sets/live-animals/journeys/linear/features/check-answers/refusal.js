import * as state from '../../../../../../engine/index.js'
import { partiesForRender } from '../addresses/parties-for-render.js'
import { cardStoredErrors } from '../../flow/stored-answers.js'
import { REVIEW_CARDS } from './view-model/incomplete-cards.js'
import { outstandingPartyErrors } from './view-model/outstanding-parties.js'

/** True when the review page must refuse the notification: unfinished, a
 * deleted party address, or a stored answer past its rules. Shared with the
 * declaration submit so a bookmark or back-button cannot sneak a stale
 * submission past the review page's refusal. Submitted notifications are
 * never refused — they are records of what was sent.
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
