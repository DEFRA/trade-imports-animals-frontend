import { pagePath } from '../../../../../../shared/paths.js'
import { TEMPLATES } from '../../config.js'
import * as state from '../../../../../../engine/index.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} from '../../../../../../lib/http-status.js'
import * as kit from '../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../shared/copy.js'
import { isBlank } from '../../../../../../lib/answered.js'
import { commodityCodesOf, linesOf } from '../commodities/lines.js'
import {
  animalIdentificationPage,
  consignmentDetailsPage
} from '../commodities/page.js'
import { toDisplayParty } from '../addresses/frozen-parties.js'
import { permanentAddressPage as page } from './page.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'
import {
  addressableUnits,
  anyLineNeedsPermanentAddress,
  buildCards,
  linesNeedingPermanentAddress
} from './cards.js'
import { answersFromPayload } from './answers.js'
import { linesWithAnswered, writeAnswers } from './write.js'
import { refusalsFor } from './validate.js'
import { summaryTextFor } from './summary.js'

export const meta = { ...page, collects: [] }
const view = `${TEMPLATES}/features/permanent-address/template`

const copy = copyFor({ en, cy })

const ADDRESSES_HUB_SLUGS = ['addresses']

const render = (
  request,
  h,
  journey,
  cards,
  { recoverableError = false, emptyState = null } = {}
) =>
  h.view(view, {
    ...kit.base(copy.title, {
      backLink:
        kit.hubEntryReturn(request, ADDRESSES_HUB_SLUGS) ??
        kit.trailBackLink(request),
      journey,
      page,
      recoverableError
    }),
    copy,
    cards,
    emptyState,
    errorSummary: kit.errorSummary(summaryTextFor(cards, copy))
  })

const anyLineNeedingPermanentAddressIsCounted = (answers, evaluation) =>
  linesNeedingPermanentAddress(answers, evaluation).some(
    ({ entry }) => !isBlank(entry.numberOfAnimalsQuantity)
  )

const emptyStateApplying = (answers, evaluation) =>
  anyLineNeedingPermanentAddressIsCounted(answers, evaluation)
    ? {
        copy: copy.noAnimalsIdentified,
        linkedPage: animalIdentificationPage,
        reason: 'permanent-address-no-animal-identified',
        messages: {
          shown:
            'Permanent address shown with no animal identified on a line that needs one',
          continuedPast:
            'Permanent address continued past with no animal identified on a line that needs one'
        }
      }
    : {
        copy: copy.noAnimalsCounted,
        linkedPage: consignmentDetailsPage,
        reason: 'permanent-address-no-animal-counted',
        messages: {
          shown:
            'Permanent address shown with no animal counted on a line that needs one',
          continuedPast:
            'Permanent address continued past with no animal counted on a line that needs one'
        }
      }

const emptyStateLinkingTo = (
  request,
  { copy: emptyStateCopy, linkedPage }
) => ({
  copy: emptyStateCopy,
  href: kit.carryTrail(
    request,
    pagePath(request.params.journeyId, linkedPage.slug)
  )
})

const renderCards = (answers, evaluation, placeOfDestination) =>
  buildCards(answers, evaluation, placeOfDestination, copy)

const renderAnsweredCards = (
  answers,
  evaluation,
  placeOfDestination,
  answered,
  fieldErrors = {}
) =>
  buildCards(
    {
      ...answers,
      commodityLines: linesWithAnswered(linesOf(answers, evaluation), answered)
    },
    evaluation,
    placeOfDestination,
    copy,
    fieldErrors
  )

const noLineNeedsAPermanentAddress = (answers, evaluation) =>
  !anyLineNeedsPermanentAddress(answers, evaluation)

const noAnimalIdentifiedOnALineThatNeedsOne = (answers, evaluation) =>
  anyLineNeedsPermanentAddress(answers, evaluation) &&
  addressableUnits(answers, evaluation).length === 0

const logSkipped = (request, answers, evaluation) =>
  request.logger.info(
    {
      journeyId: request.params.journeyId,
      reason: 'no-animal-needs-permanent-address',
      commodityCodes: commodityCodesOf(linesOf(answers, evaluation))
    },
    'Permanent address skipped: no animal on this consignment needs a permanent address'
  )

const redirectSkipping = (request, h, answers, evaluation, scope) => {
  logSkipped(request, answers, evaluation)
  return h.redirect(kit.nextTargetKeepingTrail(request, page, scope))
}

const logNoAddressableAnimal = (
  request,
  answers,
  evaluation,
  emptyState,
  outcome
) =>
  request.logger.info(
    {
      journeyId: request.params.journeyId,
      reason: emptyState.reason,
      commodityCodes: commodityCodesOf(
        linesNeedingPermanentAddress(answers, evaluation)
      )
    },
    emptyState.messages[outcome]
  )

const get = async (request, h) => {
  const { journey, answers, evaluation, scope } = await state.get(request, h)
  if (noLineNeedsAPermanentAddress(answers, evaluation)) {
    return redirectSkipping(request, h, answers, evaluation, scope)
  }
  if (noAnimalIdentifiedOnALineThatNeedsOne(answers, evaluation)) {
    const emptyState = emptyStateApplying(answers, evaluation)
    logNoAddressableAnimal(request, answers, evaluation, emptyState, 'shown')
    return render(request, h, journey, [], {
      emptyState: emptyStateLinkingTo(request, emptyState)
    })
  }
  const placeOfDestinationParty = await toDisplayParty(
    answers.placeOfDestination
  )
  return render(
    request,
    h,
    journey,
    renderCards(answers, evaluation, placeOfDestinationParty)
  )
}

const post = async (request, h) => {
  const { journey, answers, evaluation, scope } = await state.get(request, h)
  if (noLineNeedsAPermanentAddress(answers, evaluation)) {
    return redirectSkipping(request, h, answers, evaluation, scope)
  }
  if (noAnimalIdentifiedOnALineThatNeedsOne(answers, evaluation)) {
    logNoAddressableAnimal(
      request,
      answers,
      evaluation,
      emptyStateApplying(answers, evaluation),
      'continuedPast'
    )
    return h.redirect(kit.nextTargetKeepingTrail(request, page, scope))
  }

  const payload = request.payload ?? {}
  const units = addressableUnits(answers, evaluation)
  const placeOfDestinationParty = await toDisplayParty(
    answers.placeOfDestination
  )
  const { fieldErrors, placeOfDestinationErrors, values } = refusalsFor(
    payload,
    units,
    Boolean(placeOfDestinationParty)
  )
  const answered = answersFromPayload(
    values,
    answers,
    evaluation,
    answers.placeOfDestination
  )

  if (Object.keys(fieldErrors).length > 0) {
    if (Object.keys(placeOfDestinationErrors).length > 0) {
      kit.logRefusal(request, {
        level: 'warn',
        reason: 'permanent-address-place-of-destination-unknown',
        fieldErrors: placeOfDestinationErrors
      })
    }
    return render(
      request,
      h,
      journey,
      renderAnsweredCards(
        answers,
        evaluation,
        placeOfDestinationParty,
        answered,
        fieldErrors
      )
    ).code(HTTP_STATUS_BAD_REQUEST)
  }

  const { failure } = await kit.recoverableSave(
    request,
    () => writeAnswers(request, h, answered, linesOf(answers, evaluation)),
    async () =>
      render(
        request,
        h,
        journey,
        renderAnsweredCards(
          answers,
          evaluation,
          placeOfDestinationParty,
          answered
        ),
        { recoverableError: true }
      ).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
  )
  if (failure) {
    return failure
  }

  const { scope: savedScope } = await state.get(request, h)
  return h.redirect(
    kit.hubEntryReturn(request, ADDRESSES_HUB_SLUGS) ??
      kit.nextTarget(request, page, savedScope)
  )
}

export const routes = kit.pageRoutes(page, { get, post })
