import { hubPath, pagePath } from '../../../../../../shared/paths.js'
import { TEMPLATES } from '../../config.js'
import * as state from '../../../../../../engine/index.js'
import {
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
import { changeHref } from './view-model/rows/change-link.js'
import { invalidPartyErrors } from './view-model/invalid-parties.js'
import {
  cardAnchorHref,
  incompleteCardErrors,
  REVIEW_CARDS,
  withCardErrors
} from './view-model/incomplete-cards.js'
import { cardStoredErrors } from '../../flow/stored-answers.js'
import { partiesFromStoredAnswers } from '../addresses/frozen-parties.js'
import { partyOf } from '../addresses/parties.js'
import { partyEditHref } from '../addresses/party-edit/edit-href.js'
import { documentScanCardErrors } from './refusal.js'
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
 * Party errors are keyed `party:<id>` here because `contactAddress` is both a
 * party id and a card id: unprefixed, the card's message would overwrite the
 * party's and the party entry would link to the card anchor.
 *
 * Focus is only moved to the summary when the user has just been refused, so a
 * plain visit does not yank the caret out of the page heading. */
const PARTY_KEY_PREFIX = 'party:'

const reviewErrorSummary = (
  journeyId,
  cardErrors,
  partyErrors,
  disableAutoFocus
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
              CYA_SLUG
            )
          : (cardAnchorHref(key) ?? changeHref(journeyId, key)),
      disableAutoFocus
    }
  )

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
    disableAutoFocus = true
  }
) => {
  const sections = withCardErrors(
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
  )
  return h.view(view, {
    pageTitle: copy.title,
    heading: copy.title,
    copy,
    sharedCopy,
    concurrencyToken: journey.concurrencyToken,
    declarationHref: pagePath(journey.journeyId, declarationPage.slug),
    journeyStrip: journeyStrip(journey),
    errorSummary: reviewErrorSummary(
      journey.journeyId,
      cardErrors,
      partyErrors,
      disableAutoFocus
    ),
    sections,
    readOnly,
    amendmentCancelled,
    recoverableError,
    copyAction: readOnly ? { href: pagePath(journey.journeyId, 'copy') } : null,
    deleteHref:
      readOnly && journey.status === state.SUBMITTED
        ? pagePath(journey.journeyId, 'delete')
        : null,
    cancelAmendHref:
      journey.status === state.AMEND
        ? pagePath(journey.journeyId, 'cancel-amend')
        : null,
    backLink: hubPath(journey.journeyId)
  })
}

export const renderNotificationView = async (
  request,
  h,
  { recoverableError = false } = {}
) => {
  const { journey, answers, storedAnswers, scope, evaluation } =
    await state.get(request, h)
  const readOnly = journey.status === state.SUBMITTED
  const parties = await partiesFromStoredAnswers(answers)
  // A submitted notification is a record of what was sent, so nothing on it
  // is outstanding, and no stored answer of its is named as stale either —
  // both read as empty on a read-only notification.
  //
  // Each card's page reads `answers` here, and is handed the raw
  // `storedAnswers` via context, so its own rules decide for themselves which
  // of the two they need.
  const invalidCardErrors = readOnly
    ? {}
    : await cardStoredErrors(REVIEW_CARDS, answers, { request, storedAnswers })
  // A refused Continue now lands here by redirect, so the review names a
  // still-scanning document itself rather than relying on the refusal to.
  const scanDocErrors = readOnly ? {} : await documentScanCardErrors(answers)
  return renderCya(h, journey, {
    answers,
    scope,
    evaluation,
    readOnly,
    amendmentCancelled: readOnly && request.query.cancelled === '1',
    recoverableError,
    parties,
    partyErrors: readOnly ? {} : await invalidPartyErrors(answers),
    // Incomplete wins over invalid on the same card: spread the invalid map
    // first and the incomplete map second, so a card that is both unfinished
    // and carrying a stale value says "complete this section" rather than
    // naming the stale answer.
    cardErrors: readOnly
      ? {}
      : {
          ...invalidCardErrors,
          ...scanDocErrors,
          ...incompleteCardErrors(answers, scope, evaluation)
        },
    disableAutoFocus: request.query.refused !== '1'
  })
}

const get = async (request, h) => renderNotificationView(request, h)

// Continue posts to the declaration, which alone decides whether the trader may
// declare, so the review has no POST of its own.
export const routes = pageRoutes(page, { get })
