import * as state from '../../../../../../engine/index.js'
import { cardStoredErrors } from '../../flow/stored-answers.js'
import { REVIEW_CARDS } from './view-model/incomplete-cards.js'
import { invalidPartyErrors } from './view-model/invalid-parties.js'
import { toArray } from './view-model/rows/value-text.js'
import {
  hasRejectedDocuments,
  withScanStatus
} from '../documents/scan/status.js'
import { SCAN_STATUS } from '../documents/scan-poll.js'
import { copyFor } from '../../../../../../shared/copy.js'
import { copy as en } from '../documents/copy/copy.en.js'
import { copy as cy } from '../documents/copy/copy.cy.js'
import { copy as reviewEn } from './copy/copy.en.js'
import { copy as reviewCy } from './copy/copy.cy.js'
import { linesWithUnlistedSpecies } from '../../../../services/commodities/species-check.js'

const documentsCopy = copyFor({ en, cy })
const reviewCopy = copyFor({ en: reviewEn, cy: reviewCy })

const chosenSpecies = (answers) =>
  toArray(answers.commodityLines)
    .filter((line) => line?.commodityCode && line?.speciesLatinName)
    .map((line) => ({
      code: line.commodityCode,
      latinName: line.speciesLatinName
    }))

const draftUnlistedSpecies = async (journey, answers, { refused }) => {
  if (!refused || journey.status !== state.DRAFT) {
    return []
  }
  return linesWithUnlistedSpecies(chosenSpecies(answers))
}

export const speciesCardErrors = async (journey, answers, options) => {
  const unlisted = await draftUnlistedSpecies(journey, answers, options)
  if (unlisted.length === 0) {
    return {}
  }
  const speciesWithCodes = unlisted
    .map(({ code, latinName }) => `${latinName} (${code})`)
    .join(', ')
  return {
    species: reviewCopy.errors.species.notListed(speciesWithCodes)
  }
}

const documentScanStatuses = async (request, answers) => {
  const documents = toArray(answers.documents)
  if (documents.length === 0) {
    return []
  }
  return withScanStatus(
    documents.map((entry) => ({ entry })),
    { refresh: false, request }
  )
}

/**
 * The card errors for the uploaded documents' scans.
 *
 * @param {object} request - the request being answered.
 * @param {object} answers - the journey's answers.
 * @param {object} [options]
 * @param {boolean} [options.includePending=true] - whether a pending scan counts as an error
 * @returns {Promise<object>} the `documents` error for a rejected scan, or for
 * a pending one when `includePending` is true, else none.
 */
export const documentScanCardErrors = async (
  request,
  answers,
  { includePending = true } = {}
) => {
  const withStatus = await documentScanStatuses(request, answers)
  if (hasRejectedDocuments(withStatus)) {
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
  if (Object.keys(await documentScanCardErrors(request, answers)).length > 0) {
    return true
  }
  const unlisted = await draftUnlistedSpecies(journey, answers, {
    refused: true
  })
  if (unlisted.length === 0) {
    return false
  }
  request.logger.warn(
    { journeyId: journey.journeyId, unlisted },
    'Draft refused: reference data no longer lists a chosen species'
  )
  return true
}
