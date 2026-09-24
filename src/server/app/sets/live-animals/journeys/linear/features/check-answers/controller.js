import { hubPath, pagePath } from '../../../../../../shared/paths.js'
import { TEMPLATES } from '../../config.js'
import { nextInSection } from '../../../../../../flow/navigation.js'
import * as state from '../../../../../../engine/index.js'
import {
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
import { outstandingPartyErrors } from './view-model/outstanding-parties.js'
import {
  cardAnchorHref,
  incompleteCardErrors,
  REVIEW_CARDS,
  withCardErrors
} from './view-model/incomplete-cards.js'
import { cardStoredErrors } from '../../flow/stored-answers.js'
import { partiesForRender } from '../addresses/parties-for-render.js'
import { HTTP_STATUS_BAD_REQUEST } from '../../../../../../lib/http-status.js'
import { isReviewRefused } from './refusal.js'

const view = `${TEMPLATES}/features/check-answers/template`

const copy = copyFor({ en, cy })
const sharedCopy = copyFor({ en: sharedEn, cy: sharedCy })

/** One summary over both kinds of refusal: first the roles whose saved address
 * no longer resolves, then the cards with answers still outstanding. A role
 * that broke is a more particular statement than "complete this card", so it
 * leads; the cards follow in page order. An unfinished card is somewhere on
 * this page, so its entry is an anchor; a party's entry links back to the
 * party's own page, because that is where the answer is given.
 * `cardAnchorHref` tells the two apart — the keys never collide, card ids and
 * party ids being drawn from different lists.
 *
 * Focus is only moved to the summary when the user has just been refused, so a
 * plain visit does not yank the caret out of the page heading. */
const reviewErrorSummary = (
  journeyId,
  cardErrors,
  partyErrors,
  disableAutoFocus
) =>
  errorSummary(
    { ...partyErrors, ...cardErrors },
    {
      href: (key) => cardAnchorHref(key) ?? changeHref(journeyId, key),
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
  { recoverableError = false, disableAutoFocus = true } = {}
) => {
  const { journey, answers, storedAnswers, scope, evaluation } =
    await state.get(request, h)
  const readOnly = journey.status === state.SUBMITTED
  // Outstanding parties are read from what was SAVED, not from what survived
  // the read-path sanitiser: the sanitiser drops a party whose address-book
  // reference no longer resolves, which is precisely the case this page has to
  // name. The rest of the page still renders from the sanitised answers.
  const source = storedAnswers ?? answers
  const parties = await partiesForRender(request, journey, source)
  // A submitted notification is a record of what was sent, so nothing on it
  // is outstanding, and no stored answer of its is named as stale either —
  // both read as empty on a read-only notification.
  //
  // Each card's page reads the sanitised `answers` here, and is handed the
  // raw `storedAnswers` via context, so its own rules decide for themselves
  // which of the two they need. The contact page's deleted-address rule is
  // precisely the difference between them: it fires when `storedAnswers`
  // still carries the address id but the sanitised `answers` has had it
  // dropped, which is exactly how it tells a deleted address from one never
  // chosen.
  const invalidCardErrors = readOnly
    ? {}
    : await cardStoredErrors(REVIEW_CARDS, answers, { request, storedAnswers })
  return renderCya(h, journey, {
    answers,
    scope,
    evaluation,
    readOnly,
    amendmentCancelled: readOnly && request.query.cancelled === '1',
    recoverableError,
    parties,
    partyErrors: readOnly ? {} : outstandingPartyErrors(source, parties),
    // Incomplete wins over invalid on the same card: spread the invalid map
    // first and the incomplete map second, so a card that is both unfinished
    // and carrying a stale value says "complete this section" rather than
    // naming the stale answer.
    cardErrors: readOnly
      ? {}
      : {
          ...invalidCardErrors,
          ...incompleteCardErrors(answers, scope, evaluation)
        },
    disableAutoFocus
  })
}

const get = async (request, h) => renderNotificationView(request, h)

const post = async (request, h) => {
  // Refuses on the shared predicate — see `refusal.js`. The declaration
  // handler asks the same question, so a trader landing there past this
  // page cannot sneak past.
  if (await isReviewRefused(request, h)) {
    const rendered = await renderNotificationView(request, h, {
      disableAutoFocus: false
    })
    return rendered.code(HTTP_STATUS_BAD_REQUEST)
  }
  const { journey, scope } = await state.get(request, h)
  return h.redirect(nextInSection(page.id, scope, journey.journeyId))
}

export const routes = pageRoutes(page, { get, post })
