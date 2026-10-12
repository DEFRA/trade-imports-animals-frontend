import {
  dashboardPath,
  hubPath,
  pagePath
} from '../../../../../../shared/paths.js'
import { TEMPLATES } from '../../config.js'
import { nextInSection } from '../../../../../../flow/navigation.js'
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
import { HTTP_STATUS_BAD_REQUEST } from '../../../../../../lib/http-status.js'
import { documentsRejectedCardErrors, reviewRefusal } from './refusal.js'

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
  const title = readOnly ? journey.journeyId : reviewTitle(journey)
  return h.view(view, {
    pageTitle: title,
    heading: title,
    copy,
    sharedCopy,
    concurrencyToken: journey.concurrencyToken,
    journeyStrip: readOnly
      ? null
      : journeyStrip(journey, { offerCancelAmend: false }),
    viewHeader: readOnly ? viewHeaderOf(journey) : null,
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
    deleteHref: pagePath(journey.journeyId, 'delete'),
    cancelAmendHref: amending
      ? pagePath(journey.journeyId, CANCEL_AMEND_SLUG)
      : null,
    backLink: readOnly ? dashboardPath() : hubPath(journey.journeyId)
  })
}

export const renderNotificationView = async (
  request,
  h,
  {
    recoverableError = false,
    disableAutoFocus = true,
    extraCardErrors = {},
    refused = false
  } = {}
) => {
  const { journey, answers, storedAnswers, scope, evaluation } =
    await state.get(request, h)
  const readOnly = state.isSubmittedStatus(journey.status)
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
  // A REJECTED scan is a permanent verdict on a stored file, so it belongs on the read
  // path — a mid-upload PENDING is (or should be) a transient state so shouldn't
  // present as an error.
  const rejectedDocErrors = holdsSilently
    ? {}
    : await documentsRejectedCardErrors(answers)
  return renderCya(h, journey, {
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
          ...rejectedDocErrors,
          ...extraCardErrors,
          ...incompleteCardErrors(answers, scope, evaluation)
        },
    speciesErrors: holdsSilently
      ? {}
      : unfinishedSpeciesErrors(answers, evaluation),
    disableAutoFocus
  })
}

const renderOrList = async (request, h) => {
  try {
    return await renderNotificationView(request, h)
  } catch (error) {
    if (state.isJourneyNotFound(error)) {
      return h.redirect(dashboardPath())
    }
    throw error
  }
}

const get = async (request, h) => {
  await completeOpeningRun(request, h, request.params.journeyId)
  return renderOrList(request, h)
}

const post = async (request, h) => {
  // Reuse the scan errors reviewRefusal already computed — a fresh
  // documentScanCardErrors call here would issue a second HTTP GET per
  // stored document to the upload backend.
  const { refused, extraCardErrors } = await reviewRefusal(request, h)
  if (refused) {
    const rendered = await renderNotificationView(request, h, {
      refused: true,
      disableAutoFocus: false,
      extraCardErrors
    })
    return rendered.code(HTTP_STATUS_BAD_REQUEST)
  }
  const { journey, scope } = await state.get(request, h)
  return h.redirect(nextInSection(page.id, scope, journey.journeyId))
}

export const routes = pageRoutes(page, { get, post })
