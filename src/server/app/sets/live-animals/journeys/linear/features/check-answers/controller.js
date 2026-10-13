import {
  hubPath,
  pagePath,
  templatesPath
} from '../../../../../../shared/paths.js'
import {
  inTemplateMode,
  templateOwnerId
} from '../../../../../../shared/template-mode.js'
import * as templates from '../../../../../../services/templates/index.js'
import { TEMPLATES } from '../../config.js'
import { rememberSavedTemplate } from '../templates/saved-banner.js'
import * as state from '../../../../../../engine/index.js'
import { completeOpeningRun } from '../../../../../../flow/run-state.js'
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
import { recordReviewed } from './reviewed.js'
import { declarationPage } from '../declaration/page.js'

const view = `${TEMPLATES}/features/check-answers/template`

const copy = copyFor({ en, cy })
const sharedCopy = copyFor({ en: sharedEn, cy: sharedCy })

const reviewWording = () =>
  inTemplateMode()
    ? { title: copy.template.title, submitText: copy.template.saveTemplate }
    : { title: copy.title, submitText: copy.submit.button }

/** Where the review's button posts: on to the declaration, or, for a template,
 * back here to save it. */
const submitAction = (journeyId) =>
  inTemplateMode()
    ? pagePath(journeyId, page.slug)
    : pagePath(journeyId, declarationPage.slug)

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
    disableAutoFocus = true
  }
) => {
  const { title, submitText } = reviewWording()
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
  return toolkit.view(view, {
    pageTitle: title,
    heading: title,
    submitText,
    templateMode: inTemplateMode(),
    copy,
    sharedCopy,
    concurrencyToken: journey.concurrencyToken,
    declarationHref: submitAction(journey.journeyId),
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
    backLink: hubPath(journey.journeyId)
  })
}

export const renderNotificationView = async (
  request,
  toolkit,
  { recoverableError = false } = {}
) => {
  const { journey, answers, storedAnswers, scope, evaluation } =
    await state.get(request, toolkit)
  const readOnly = journey.status === state.SUBMITTED
  const refused = request.query.refused === '1'
  // c-201: an amendment opens with no errors; Continue refused shows them.
  // A template is reviewed as it stands: nothing on it is owed, so a template
  // review names no card, role, stale answer or document as unfinished.
  const holdsSilently =
    readOnly || inTemplateMode() || (journey.status === state.AMEND && !refused)
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
    disableAutoFocus: !refused
  })
}

const get = async (request, toolkit) => {
  await completeOpeningRun(request, toolkit, request.params.journeyId)
  const response = await renderNotificationView(request, toolkit)
  const { journey } = await state.get(request, toolkit)
  if (journey.status !== state.SUBMITTED) {
    await recordReviewed(request, toolkit, journey)
  }
  return response
}

// Save template stores the template instead of going on to the declaration: a
// template holds no declaration, and Manage templates confirms it once with a
// success banner. A notification's review posts to the declaration, never here,
// so a post here outside template mode goes back to the review.
const post = async (request, toolkit) => {
  if (!inTemplateMode()) {
    return toolkit.redirect(pagePath(request.params.journeyId, page.slug))
  }
  const saved = await templates.saveFor(
    templateOwnerId(),
    request.params.journeyId
  )
  if (saved) {
    rememberSavedTemplate(request, saved)
  }
  return toolkit.redirect(templatesPath())
}

export const routes = pageRoutes(page, { get, post })
