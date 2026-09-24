import * as state from '../../../../../../engine/index.js'
import { partiesForRender } from '../addresses/parties-for-render.js'
import { cardStoredErrors } from '../../flow/stored-answers.js'
import { REVIEW_CARDS } from './view-model/incomplete-cards.js'
import { outstandingPartyErrors } from './view-model/outstanding-parties.js'

/** True when the review page must refuse the notification: an unfinished
 * obligation, an address whose party has been deleted, or a stored answer that
 * no longer passes its own page's rules. One place so the CYA Continue button
 * and the declaration submit measure it the same way — a trader who lands on
 * the declaration URL past the review page (a bookmark, a back-button) cannot
 * sneak past a refusal the review page would have shown them.
 *
 * A submitted notification is never refused — it is a record of what was sent.
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
