import {
  dashboardPath,
  hubPath,
  pagePath
} from '../../../../../../shared/paths.js'
import { TEMPLATES } from '../../config.js'
import * as state from '../../../../../../engine/index.js'
import {
  cancelAmendControl,
  CYA_SLUG,
  errorSummary,
  journeyStrip,
  pageRoutes,
  trailBackLink,
  requestTrail,
  trailPlus,
  sharedCopy
} from '../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../shared/copy.js'
import { notificationViewPage as page } from './page.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'
import { organisationIdOf } from '../../../../../../../common/helpers/organisation-id.js'
import { buildSections } from './view-model/index.js'
import { deleteButtonFor, viewHeader } from './view-model/view-header.js'
import { changeHref } from './view-model/rows/change-link.js'
import { invalidPartyErrors } from './view-model/invalid-parties.js'
import { speciesErrors } from './view-model/species-errors.js'
import {
  cardAnchorHref,
  incompleteCardErrors,
  REVIEW_CARDS,
  withCardErrors
} from './view-model/incomplete-cards.js'
import { cardStoredErrors } from '../../flow/stored-answers.js'
import { partiesFromStoredAnswers } from '../addresses/frozen-parties.js'
import { permanentAddressesFromStoredAnswers } from '../permanent-address/saved-addresses.js'
import { partyOf } from '../addresses/parties.js'
import { partyEditHref } from '../addresses/party-edit/edit-href.js'
import { documentScanCardErrors, unlistedSpeciesErrors } from './refusal.js'
import { recordReviewed } from './reviewed.js'
import { declarationPage } from '../declaration/page.js'

const view = `${TEMPLATES}/features/check-answers/template`

const copy = copyFor({ en, cy })

const PARTY_KEY_PREFIX = 'party:'

const anchorsOf = (sections) =>
  new Set(
    sections.flatMap((section) => [
      section.anchor,
      ...section.cards.flatMap((card) => [
        card.anchor,
        ...(card.speciesBlocks ?? []).map((block) => block.anchor)
      ])
    ])
  )

const reviewErrorSummary = (
  journeyId,
  changeLinkTrail,
  reviewPageTrail,
  cardErrors,
  partyErrors,
  { disableAutoFocus, pageAnchors }
) =>
  errorSummary(
    {
      ...Object.fromEntries(
        Object.entries(partyErrors).map(([id, text]) => [
          `${PARTY_KEY_PREFIX}${id}`,
          text
        ])
      ),
      ...cardErrors
    },
    {
      href: (key) =>
        key.startsWith(PARTY_KEY_PREFIX)
          ? partyEditHref(
              journeyId,
              partyOf(key.slice(PARTY_KEY_PREFIX.length)),
              CYA_SLUG,
              reviewPageTrail
            )
          : (cardAnchorHref(key, pageAnchors) ??
            changeHref({ journeyId, changeLinkTrail }, key)),
      disableAutoFocus
    }
  )

const backLinkFor = (request, journey) =>
  trailBackLink(request, {
    fallback:
      journey.status === state.AMEND
        ? hubPath(journey.journeyId)
        : dashboardPath()
  })

const cancelAmendButtonFor = (journey) => {
  const cancelAmend = cancelAmendControl(journey)
  return cancelAmend
    ? { ...cancelAmend, classes: 'govuk-button--secondary' }
    : null
}

const reviewTitle = (journey) =>
  journey.status === state.AMEND && journey.answersDifferFromSubmitted
    ? copy.resubmittingTitle
    : copy.title

const cancelAmendBanner = (amendmentCancelled) =>
  amendmentCancelled
    ? {
        titleText: copy.cancelAmend.successTitle,
        text: copy.cancelAmend.successBody
      }
    : null

const renderCya = async (
  request,
  h,
  journey,
  {
    answers,
    scope,
    evaluation,
    readOnly,
    amendmentCancelled,
    recoverableError = false,
    parties = answers,
    partyErrors = {},
    permanentAddresses = [],
    cardErrors = {},
    disableAutoFocus = true
  }
) => {
  const changeLinkTrail = trailPlus(request, CYA_SLUG)
  const reviewPageTrail = requestTrail(request)
  const sections = withCardErrors(
    await buildSections({
      answers,
      scope,
      evaluation,
      journeyId: journey.journeyId,
      changeLinkTrail,
      readOnly,
      parties,
      partyErrors,
      permanentAddresses
    }),
    cardErrors
  )
  const header = viewHeader(journey)
  const title = header ? header.reference : reviewTitle(journey)
  return h.view(view, {
    pageTitle: title,
    heading: title,
    copy,
    sharedCopy,
    concurrencyToken: journey.concurrencyToken,
    declarationHref: pagePath(journey.journeyId, declarationPage.slug),
    journeyStrip: header ? null : journeyStrip(journey),
    viewHeader: header,
    errorSummary: reviewErrorSummary(
      journey.journeyId,
      changeLinkTrail,
      reviewPageTrail,
      cardErrors,
      partyErrors,
      { disableAutoFocus, pageAnchors: anchorsOf(sections) }
    ),
    sections,
    readOnly,
    successBanner: cancelAmendBanner(amendmentCancelled),
    recoverableError,
    deleteButton:
      journey.status === state.AMEND ? deleteButtonFor(journey) : null,
    cancelAmendButton: cancelAmendButtonFor(journey),
    backLink: backLinkFor(request, journey)
  })
}

const mergeCardErrorsByPrecedence = ({
  invalid,
  scan,
  unlisted,
  incomplete,
  speciesBlocks
}) => ({
  ...invalid,
  ...scan,
  ...unlisted,
  ...incomplete,
  ...speciesBlocks
})

export const renderNotificationView = async (
  request,
  h,
  { recoverableError = false } = {}
) => {
  const { journey, answers, storedAnswers, scope, evaluation } =
    await state.get(request, h)
  const readOnly = journey.status === state.SUBMITTED
  const refused = request.query.refused === '1'
  const hidesAnswerErrors =
    readOnly || (journey.status === state.AMEND && !refused)
  const [parties, permanentAddresses] = await Promise.all([
    partiesFromStoredAnswers(answers),
    permanentAddressesFromStoredAnswers(answers, evaluation)
  ])
  const invalidCardErrors = hidesAnswerErrors
    ? {}
    : await cardStoredErrors(REVIEW_CARDS, answers, { request, storedAnswers })
  const scanDocErrors = hidesAnswerErrors
    ? {}
    : await documentScanCardErrors(request, answers, {
        includePending: refused
      })
  const unlistedErrors = hidesAnswerErrors
    ? {}
    : await unlistedSpeciesErrors(journey, answers, { refused })
  return renderCya(request, h, journey, {
    answers,
    scope,
    evaluation,
    readOnly,
    amendmentCancelled: readOnly && request.query.cancelled === '1',
    recoverableError,
    parties,
    permanentAddresses,
    partyErrors: hidesAnswerErrors ? {} : await invalidPartyErrors(answers),
    cardErrors: hidesAnswerErrors
      ? {}
      : mergeCardErrorsByPrecedence({
          invalid: invalidCardErrors,
          scan: scanDocErrors,
          unlisted: unlistedErrors,
          incomplete: incompleteCardErrors(answers, scope, evaluation),
          speciesBlocks: speciesErrors(answers, evaluation)
        }),
    disableAutoFocus: !refused
  })
}

const renderAndRecordReviewed = async (request, h) => {
  const response = await renderNotificationView(request, h)
  const { journey } = await state.get(request, h)
  if (journey.status !== state.SUBMITTED) {
    await recordReviewed(request, h, journey)
  }
  return response
}

const redirectToNotificationList = (request, h) => {
  request.logger.info(
    {
      journeyId: request.params.journeyId,
      path: request.path,
      organisationId: organisationIdOf(request)
    },
    'Notification not found, sent to the notification list'
  )
  return h.redirect(dashboardPath())
}

const get = async (request, h) => {
  try {
    return await renderAndRecordReviewed(request, h)
  } catch (error) {
    if (state.isJourneyNotFound(error)) {
      return redirectToNotificationList(request, h)
    }
    throw error
  }
}

export const routes = pageRoutes(page, { get })
