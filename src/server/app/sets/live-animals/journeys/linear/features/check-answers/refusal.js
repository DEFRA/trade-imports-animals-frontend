import * as state from '../../../../../../engine/index.js'
import { cardStoredErrors } from '../../flow/stored-answers.js'
import { REVIEW_CARDS } from './view-model/incomplete-cards.js'
import { invalidPartyErrors } from './view-model/invalid-parties.js'
import { withScanStatus } from '../documents/scan/status.js'
import { SCAN_STATUS } from '../documents/scan-poll.js'
import { copyFor } from '../../../../../../shared/copy.js'
import { copy as en } from '../documents/copy/copy.en.js'
import { copy as cy } from '../documents/copy/copy.cy.js'

const documentsCopy = copyFor({ en, cy })

const documentScanStatuses = async (answers) => {
  const documents = [answers.documents ?? []].flat()
  if (documents.length === 0) {
    return []
  }
  return withScanStatus(
    documents.map((entry) => ({ entry })),
    false
  )
}

/** A REJECTED scan is a permanent verdict on a stored file, so it is always an
 * error. A PENDING one is transient, so it is only an error when the trader
 * has just been refused for it — callers rendering a plain visit pass
 * `includePending: false`. */
export const documentScanCardErrors = async (
  answers,
  { includePending = true } = {}
) => {
  const withStatus = await documentScanStatuses(answers)
  if (withStatus.some((doc) => doc.scanStatus === SCAN_STATUS.REJECTED)) {
    return { documents: documentsCopy.errors.someRejected }
  }
  if (
    includePending &&
    withStatus.some((doc) => doc.scanStatus === SCAN_STATUS.PENDING)
  ) {
    return { documents: documentsCopy.errors.someStillScanning }
  }
  return {}
}

/** Whether the declaration must send the trader back to the review, on both
 * Continue and Submit. Each refusal is one the review page names itself, so
 * the redirect needs to carry nothing. SUBMITTED notifications are never
 * refused.
 */
export const isReviewRefused = async (request, h) => {
  const { journey, answers, storedAnswers, scope } = await state.get(request, h)
  if (journey.status === state.SUBMITTED) {
    return false
  }
  if (!scope.readyForCheckYourAnswers) {
    return true
  }
  if (Object.keys(await invalidPartyErrors(answers)).length > 0) {
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
