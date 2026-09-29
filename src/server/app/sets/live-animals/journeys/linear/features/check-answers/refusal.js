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

export const documentsRejectedCardErrors = async (answers) => {
  const withStatus = await documentScanStatuses(answers)
  return withStatus.some((doc) => doc.scanStatus === SCAN_STATUS.REJECTED)
    ? { documents: documentsCopy.errors.someRejected }
    : {}
}

export const documentScanCardErrors = async (answers) => {
  const withStatus = await documentScanStatuses(answers)
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
