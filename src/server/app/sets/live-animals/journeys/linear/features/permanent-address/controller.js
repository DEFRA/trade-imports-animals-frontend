import { pagePath } from '../../../../../../shared/paths.js'
import { TEMPLATES } from '../../config.js'
import * as state from '../../../../../../engine/index.js'
import { HTTP_STATUS_INTERNAL_SERVER_ERROR } from '../../../../../../lib/http-status.js'
import * as kit from '../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../shared/copy.js'
import { commodityCodesOf, linesOf } from '../commodities/lines.js'
import { toDisplayParty } from '../addresses/frozen-parties.js'
import { permanentAddressPage as page } from './page.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'
import {
  PLACE_OF_DESTINATION,
  addressableUnits,
  buildCards,
  cardKeyFor
} from './cards.js'
import { answersFromPayload } from './answers.js'
import { linesWithAnswered, writeAnswers } from './write.js'

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
    cards
  })

const renderCards = async (answers, evaluation) =>
  buildCards(
    answers,
    evaluation,
    await toDisplayParty(answers.placeOfDestination),
    copy
  )

const renderAnsweredCards = async (answers, evaluation, answered) =>
  buildCards(
    {
      ...answers,
      commodityLines: linesWithAnswered(linesOf(answers, evaluation), answered)
    },
    evaluation,
    await toDisplayParty(answers.placeOfDestination),
    copy
  )

const redirectWhenNoAnimalNeedsAPermanentAddress = async (
  request,
  h,
  answers,
  evaluation,
  scope
) => {
  if (addressableUnits(answers, evaluation).length > 0) {
    return null
  }
  request.logger.info(
    {
      journeyId: request.params.journeyId,
      reason: 'no-animal-needs-permanent-address',
      commodityCodes: commodityCodesOf(linesOf(answers, evaluation))
    },
    'Permanent address skipped: no animal on this consignment needs a permanent address'
  )
  return h.redirect(kit.nextTargetKeepingTrail(request, page, scope))
}

const cardsAnsweredBeforeAPlaceOfDestinationIsKnown = (answered) =>
  answered
    .filter(
      ({ permanentAddressOrigin, permanentAddress }) =>
        permanentAddressOrigin === PLACE_OF_DESTINATION && !permanentAddress
    )
    .map(({ lineIndex, unitIndex }) => cardKeyFor(lineIndex, unitIndex))

const logPlaceOfDestinationUnknown = (request, answered) => {
  const cards = cardsAnsweredBeforeAPlaceOfDestinationIsKnown(answered)
  if (cards.length === 0) {
    return
  }
  request.logger.warn(
    {
      journeyId: request.params.journeyId,
      reason: 'permanent-address-place-of-destination-unknown',
      cards
    },
    'Permanent address saved as the place of destination before one was chosen'
  )
}

const get = async (request, h) => {
  const { journey, answers, evaluation, scope } = await state.get(request, h)
  const noAnimalRedirect = await redirectWhenNoAnimalNeedsAPermanentAddress(
    request,
    h,
    answers,
    evaluation,
    scope
  )
  if (noAnimalRedirect) {
    return noAnimalRedirect
  }
  return render(request, h, journey, await renderCards(answers, evaluation))
}

const post = async (request, h) => {
  const { journey, answers, evaluation, scope } = await state.get(request, h)
  const noAnimalRedirect = await redirectWhenNoAnimalNeedsAPermanentAddress(
    request,
    h,
    answers,
    evaluation,
    scope
  )
  if (noAnimalRedirect) {
    return noAnimalRedirect
  }

  const answered = answersFromPayload(
    request.payload ?? {},
    answers,
    evaluation,
    answers.placeOfDestination
  )
  logPlaceOfDestinationUnknown(request, answered)

  const { failure } = await kit.recoverableSave(
    request,
    () => writeAnswers(request, h, answered, linesOf(answers, evaluation)),
    async () =>
      render(
        request,
        h,
        journey,
        await renderAnsweredCards(answers, evaluation, answered),
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
