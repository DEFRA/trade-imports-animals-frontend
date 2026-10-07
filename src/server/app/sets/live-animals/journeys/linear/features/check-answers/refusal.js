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

const NOT_REFUSED = Object.freeze({ refused: false, extraCardErrors: {} })

/** Shared refusal predicate for the review page's Continue and the
 * declaration submit — a bookmark or back-button cannot sneak a stale
 * submission past. SUBMITTED notifications are never refused.
 *
 * Returns the scan-card errors alongside the verdict so the CYA POST handler
 * can render them without a second scan-status fetch (each fetch issues one
 * HTTP GET per stored document). Callers that need only the boolean use
 * `isReviewRefused`.
 */
export const reviewRefusal = async (request, h) => {
  const { journey, answers, storedAnswers, scope } = await state.get(request, h)
  if (journey.status === state.SUBMITTED) {
    return NOT_REFUSED
  }
  if (!scope.readyForCheckYourAnswers) {
    return { refused: true, extraCardErrors: {} }
  }
  if (Object.keys(await invalidPartyErrors(answers)).length > 0) {
    return { refused: true, extraCardErrors: {} }
  }
  const invalidCardErrors = await cardStoredErrors(REVIEW_CARDS, answers, {
    request,
    storedAnswers
  })
  if (Object.keys(invalidCardErrors).length > 0) {
    return { refused: true, extraCardErrors: {} }
  }
  const extraCardErrors = await documentScanCardErrors(answers)
  return {
    refused: Object.keys(extraCardErrors).length > 0,
    extraCardErrors
  }
}

/** Boolean-only wrapper for callers that do not render scan errors — the
 * declaration submit is one such caller: it redirects back to CYA on
 * refusal and lets the CYA GET/POST paths surface any scan verdicts.
 */
export const isReviewRefused = async (request, h) =>
  (await reviewRefusal(request, h)).refused
