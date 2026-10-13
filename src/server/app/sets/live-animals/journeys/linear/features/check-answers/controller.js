import {
  dashboardPath,
  hubPath,
  pagePath
} from '../../../../../../shared/paths.js'
import { TEMPLATES } from '../../config.js'
import * as state from '../../../../../../engine/index.js'
import { completeOpeningRun } from '../../../../../../flow/run-state.js'
import {
  CANCEL_AMEND_SLUG,
  CYA_SLUG,
  errorSummary,
  journeyStrip,
  pageRoutes
} from '../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../shared/copy.js'
import { notificationViewPage as page } from './page.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'
import { copy as sharedEn } from '../../../../../../shared/copy.en.js'
import { copy as sharedCy } from '../../../../../../shared/copy.cy.js'
import { buildSections } from './view-model/index.js'
import { withMissingHealthCertificate } from './view-model/sections/documents.js'
import { changeHref } from './view-model/rows/change-link.js'
import { invalidPartyErrors } from './view-model/invalid-parties.js'
import { viewHeaderOf } from './view-model/view-header.js'
import {
  cardAnchorHref,
  pageAnchorsOf,
  incompleteCardErrors,
  REVIEW_CARDS,
  withCardErrors
} from './view-model/incomplete-cards.js'
import {
  SPECIES_ENTRY_PREFIX,
  unfinishedSpeciesErrors,
  withSpeciesErrors
} from './view-model/species-errors.js'
import { cardStoredErrors } from '../../flow/stored-answers.js'
import { partiesFromStoredAnswers } from '../addresses/frozen-parties.js'
import { partyOf } from '../addresses/parties.js'
import { partyEditHref } from '../addresses/party-edit/edit-href.js'
import { documentScanCardErrors } from './refusal.js'
import { recordReviewed } from './reviewed.js'
import { declarationPage } from '../declaration/page.js'

const view = `${TEMPLATES}/features/check-answers/template`

const copy = copyFor({ en, cy })
const sharedCopy = copyFor({ en: sharedEn, cy: sharedCy })

/** One summary over both kinds of refusal: first the roles whose copied address
 * breaks the address-book rules, then the cards with answers still
 * outstanding. A role in error is a more particular statement than "complete
 * this card", so it leads; the cards follow in page order. An unfinished card
 * is somewhere on this page, so its entry is an anchor; a party's entry links
 * to the page that edits its address, returning here.
 *
 * Species entries follow commodity details and link to the species block on
 * this page.
 *
 * Party errors are keyed `party:<id>` here because `contactAddress` is both a
 * party id and a card id: unprefixed, the card's message would overwrite the
 * party's and the party entry would link to the card anchor.
 *
 * Focus is only moved to the summary when the user has just been refused, so a
 * plain visit does not yank the caret out of the page heading. */
const PARTY_KEY_PREFIX = 'party:'

const summaryHref = (journeyId, pageAnchors) => (key) => {
  if (key.startsWith(PARTY_KEY_PREFIX)) {
    return partyEditHref(
      journeyId,
      partyOf(key.slice(PARTY_KEY_PREFIX.length)),
      CYA_SLUG
    )
  }
  if (key.startsWith(SPECIES_ENTRY_PREFIX)) {
    return `#${key.slice(SPECIES_ENTRY_PREFIX.length)}`
  }
  return cardAnchorHref(key, pageAnchors) ?? changeHref(journeyId, key)
}

const reviewErrorSummary = (
  journeyId,
  cardErrors,
  partyErrors,
  disableAutoFocus,
  pageAnchors
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
      href: summaryHref(journeyId, pageAnchors),
      disableAutoFocus
    }
  )

const reviewTitle = (journey) =>
  journey.status === state.AMEND && journey.answersChangedSinceSubmission
    ? copy.resubmitTitle
    : copy.title

const renderCya = async (
  toolkit,
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
    cardErrors = {},
    speciesErrors = {},
    disableAutoFocus = true
  }
) => {
  const sections = withMissingHealthCertificate(
    withCardErrors(
      await buildSections(
        answers,
        scope,
        evaluation,
        journey.journeyId,
        readOnly,
        parties,
        partyErrors
      ),
      cardErrors
    ),
    journey,
    answers,
    evaluation
  )
  const amending = journey.status === state.AMEND
  const headed = readOnly || journey.status === state.DRAFT
  const title = headed ? journey.journeyId : reviewTitle(journey)
  return toolkit.view(view, {
    pageTitle: title,
    heading: title,
    copy,
    sharedCopy,
    concurrencyToken: journey.concurrencyToken,
    declarationHref: pagePath(journey.journeyId, declarationPage.slug),
    journeyStrip: headed
      ? null
      : journeyStrip(journey, { offerCancelAmend: false }),
    viewHeader: headed ? viewHeaderOf(journey) : null,
    errorSummary: reviewErrorSummary(
      journey.journeyId,
      withSpeciesErrors(cardErrors, speciesErrors),
      partyErrors,
      disableAutoFocus,
      pageAnchorsOf(sections)
    ),
    sections,
    readOnly,
    amendmentCancelled,
    recoverableError,
    deleteHref: amending ? pagePath(journey.journeyId, 'delete') : null,
    cancelAmendHref: amending
      ? pagePath(journey.journeyId, CANCEL_AMEND_SLUG)
      : null,
    backLink: amending ? hubPath(journey.journeyId) : dashboardPath()
  })
}

export const renderNotificationView = async (
  request,
  toolkit,
  { recoverableError = false } = {}
) => {
  const { journey, answers, storedAnswers, scope, evaluation } =
    await state.get(request, toolkit)
  const readOnly = state.isSubmittedStatus(journey.status)
  const refused = request.query.refused === '1'
  // c-201: an amendment opens with no errors; Continue refused shows them.
  const holdsSilently = readOnly || (journey.status === state.AMEND && !refused)
  const parties = await partiesFromStoredAnswers(answers)
  // A submitted notification is a record of what was sent, so nothing on it
  // is outstanding, and no stored answer of its is named as stale either —
  // both read as empty on a read-only notification.
  //
  // Each card's page reads `answers` here, and is handed the raw
  // `storedAnswers` via context, so its own rules decide for themselves which
  // of the two they need.
  const invalidCardErrors = holdsSilently
    ? {}
    : await cardStoredErrors(REVIEW_CARDS, answers, { request, storedAnswers })
  const scanDocErrors = holdsSilently
    ? {}
    : await documentScanCardErrors(answers, { includePending: refused })
  return renderCya(toolkit, journey, {
    answers,
    scope,
    evaluation,
    readOnly,
    amendmentCancelled: readOnly && request.query.cancelled === '1',
    recoverableError,
    parties,
    partyErrors: holdsSilently ? {} : await invalidPartyErrors(answers),
    // Incomplete wins over invalid on the same card: spread the invalid map
    // first and the incomplete map second, so a card that is both unfinished
    // and carrying a stale value says "complete this section" rather than
    // naming the stale answer.
    cardErrors: holdsSilently
      ? {}
      : {
          ...invalidCardErrors,
          ...scanDocErrors,
          ...incompleteCardErrors(answers, scope, evaluation)
        },
    speciesErrors: holdsSilently
      ? {}
      : unfinishedSpeciesErrors(answers, evaluation),
    disableAutoFocus: !refused
  })
}

const get = async (request, toolkit) => {
  await completeOpeningRun(request, toolkit, request.params.journeyId)
  try {
    const response = await renderNotificationView(request, toolkit)
    const { journey } = await state.get(request, toolkit)
    if (!state.isSubmittedStatus(journey.status)) {
      await recordReviewed(request, toolkit, journey)
    }
    return response
  } catch (error) {
    if (state.isJourneyNotFound(error)) {
      return toolkit.redirect(dashboardPath())
    }
    throw error
  }
}

export const routes = pageRoutes(page, { get })
