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
  withCardErrors
} from './view-model/incomplete-cards.js'
import { partiesForRender } from '../addresses/parties-for-render.js'
import { HTTP_STATUS_BAD_REQUEST } from '../../../../../../lib/http-status.js'

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

const renderCya = (
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
) =>
  h.view(view, {
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
    sections: withCardErrors(
      buildSections(
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
  return renderCya(h, journey, {
    answers,
    scope,
    evaluation,
    readOnly,
    amendmentCancelled: readOnly && request.query.cancelled === '1',
    recoverableError,
    parties,
    partyErrors: readOnly ? {} : outstandingPartyErrors(source, parties),
    // A submitted notification is a record of what was sent, so nothing on it
    // is outstanding however its answers now read.
    cardErrors: readOnly
      ? {}
      : incompleteCardErrors(answers, scope, evaluation),
    disableAutoFocus
  })
}

const get = async (request, h) => renderNotificationView(request, h)

const post = async (request, h) => {
  const { journey, answers, storedAnswers, scope } = await state.get(request, h)
  // Same source as the GET, or the refusal and the page would disagree.
  const source = storedAnswers ?? answers
  const parties = await partiesForRender(request, journey, source)
  // A submitted notification is read-only: the GET zeroes its errors, so the
  // POST must not refuse it either.
  const readOnly = journey.status === state.SUBMITTED
  // An unfinished notification is refused here rather than three pages later at
  // the declaration's submit, where the same readiness test used to bounce the
  // trader back to this page saying nothing. `readyForCheckYourAnswers` is the
  // roll-up of the very task rows `incompleteCardErrors` reads, so a refusal
  // always arrives with a summary naming what is left.
  const refused =
    !readOnly &&
    (!scope.readyForCheckYourAnswers ||
      Object.keys(outstandingPartyErrors(source, parties)).length > 0)
  if (refused) {
    const rendered = await renderNotificationView(request, h, {
      disableAutoFocus: false
    })
    return rendered.code(HTTP_STATUS_BAD_REQUEST)
  }
  return h.redirect(nextInSection(page.id, scope, journey.journeyId))
}

export const routes = pageRoutes(page, { get, post })
