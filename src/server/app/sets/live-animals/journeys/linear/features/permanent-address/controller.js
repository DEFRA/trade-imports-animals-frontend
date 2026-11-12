import { pagePath } from '../../../../../../shared/paths.js'
import { TEMPLATES } from '../../config.js'
import * as state from '../../../../../../engine/index.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} from '../../../../../../lib/http-status.js'
import * as kit from '../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../shared/copy.js'
import { commodityCodesOf, linesOf } from '../commodities/lines.js'
import { consignmentDetailsPage } from '../commodities/page.js'
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

const hubEntryReturn = (request) => {
  const { honouredSlug } = kit.readReturnMarker(request, ['addresses'])
  return honouredSlug
    ? kit.carryTrail(request, pagePath(request.params.journeyId, honouredSlug))
    : null
}

const render = (
  request,
  h,
  journey,
  cards,
  { recoverableError = false } = {}
) =>
  h.view(view, {
    ...kit.base(copy.title, {
      backLink: hubEntryReturn(request) ?? kit.trailBackLink(request),
      journey,
      page,
      recoverableError
    }),
    copy,
    cards,
    noAnimalsIdentifiedHref: kit.carryTrail(
      request,
      pagePath(request.params.journeyId, consignmentDetailsPage.slug)
    ),
    errorSummary: kit.errorSummary(summaryTextFor(cards, copy))
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

const logNoAnimalsIdentified = (request, answers, evaluation) =>
  request.logger.info(
    {
      journeyId: request.params.journeyId,
      reason: 'permanent-address-no-animal-identified',
      commodityCodes: commodityCodesOf(
        linesNeedingPermanentAddress(answers, evaluation)
      )
    },
    'Permanent address shown with no animal identified on a line that needs one'
  )

const get = async (request, h) => {
  const { journey, answers, evaluation, scope } = await state.get(request, h)
  if (noLineNeedsAPermanentAddress(answers, evaluation)) {
    return redirectSkipping(request, h, answers, evaluation, scope)
  }
  if (noAnimalIdentifiedOnALineThatNeedsOne(answers, evaluation)) {
    logNoAnimalsIdentified(request, answers, evaluation)
    return render(request, h, journey, [])
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
    logNoAnimalsIdentified(request, answers, evaluation)
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
    hubEntryReturn(request) ?? kit.nextTarget(request, page, savedScope)
  )
}

export const routes = kit.pageRoutes(page, { get, post })
