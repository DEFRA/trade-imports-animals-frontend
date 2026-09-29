import * as state from '../../../../../../engine/index.js'
import { partiesForRender } from '../addresses/parties-for-render.js'
import { cardStoredErrors } from '../../flow/stored-answers.js'
import { REVIEW_CARDS } from './view-model/incomplete-cards.js'
import { outstandingPartyErrors } from './view-model/outstanding-parties.js'
import { withScanStatus } from '../documents/scan/status.js'
import { SCAN_STATUS } from '../documents/scan-poll.js'
import { copyFor } from '../../../../../../shared/copy.js'
import { copy as en } from '../documents/copy/copy.en.js'
import { copy as cy } from '../documents/copy/copy.cy.js'

const documentsCopy = copyFor({ en, cy })

/** Submit-time scan gate. The catalogue-staleness rules live on the
 * documents pageValidation and fire on every read — scan state is
 * deliberately checked only from here, so a mid-upload PENDING does
 * not turn the stored-view rendering into an error (AC5). Refresh
 * false so the cached status is read; a live re-fetch would race the
 * poller and does nothing for a submit-time decision. REJECTED wins
 * over PENDING because it names a file the trader must act on rather
 * than a state they only have to wait through. */
export const documentScanCardErrors = async (answers) => {
  const documents = [answers.documents ?? []].flat()
  if (documents.length === 0) {
    return {}
  }
  const withStatus = await withScanStatus(
    documents.map((entry) => ({ entry })),
    false
  )
  if (withStatus.some((doc) => doc.scanStatus === SCAN_STATUS.REJECTED)) {
    return { documents: documentsCopy.errors.someRejected }
  }
  if (withStatus.some((doc) => doc.scanStatus === SCAN_STATUS.PENDING)) {
    return { documents: documentsCopy.errors.someStillScanning }
  }
  return {}
}

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
  if (Object.keys(invalidCardErrors).length > 0) {
    return true
  }
  return Object.keys(await documentScanCardErrors(answers)).length > 0
}
