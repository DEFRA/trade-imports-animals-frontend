import * as state from '../../../../../../engine/index.js'
import { cardStoredErrors } from '../../flow/stored-answers.js'
import { REVIEW_CARDS } from './view-model/incomplete-cards.js'
import { invalidPartyErrors } from './view-model/invalid-parties.js'
import { withScanStatus } from '../documents/scan/status.js'
import { SCAN_STATUS } from '../documents/scan-poll.js'
import { copyFor } from '../../../../../../shared/copy.js'
import { copy as en } from '../documents/copy/copy.en.js'
import { copy as cy } from '../documents/copy/copy.cy.js'
import { copy as reviewEn } from './copy/copy.en.js'
import { copy as reviewCy } from './copy/copy.cy.js'
import { linesWithUnlistedSpecies } from '../../../../services/commodities/species-check.js'
import { createLogger } from '../../../../../../../common/helpers/logging/logger.js'

const logger = createLogger()
const documentsCopy = copyFor({ en, cy })
const reviewCopy = copyFor({ en: reviewEn, cy: reviewCy })

const chosenSpecies = (answers) =>
  [answers.commodityLines ?? []]
    .flat()
    .filter((line) => line?.commodityCode && line?.speciesLatinName)
    .map((line) => ({
      code: line.commodityCode,
      latinName: line.speciesLatinName
    }))

export const speciesCardErrors = async (journey, answers) => {
  if (journey.status !== state.DRAFT) {
    return {}
  }
  const unlisted = await linesWithUnlistedSpecies(chosenSpecies(answers))
  if (unlisted.length === 0) {
    return {}
  }
  logger.warn(
    { journeyId: journey.journeyId, unlisted },
    'Draft refused: reference data no longer lists a chosen species'
  )
  const speciesWithCodes = unlisted
    .map(({ code, latinName }) => `${latinName} (${code})`)
    .join(', ')
  return {
    species: reviewCopy.errors.cards.speciesNoLongerOffered(speciesWithCodes)
  }
}

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

/** A REJECTED scan is permanent, so always an error; a PENDING one is transient,
 * so only an error when the trader has just been refused for it. */
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
  if (Object.keys(await documentScanCardErrors(answers)).length > 0) {
    return true
  }
  return Object.keys(await speciesCardErrors(journey, answers)).length > 0
}
