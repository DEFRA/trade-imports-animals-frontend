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
import { resolveParties } from '../addresses/resolve-parties.js'
import { HTTP_STATUS_BAD_REQUEST } from '../../../../../../lib/http-status.js'

const view = `${TEMPLATES}/features/check-answers/template`

const copy = copyFor({ en, cy })
const sharedCopy = copyFor({ en: sharedEn, cy: sharedCy })

// The entries link back to the party's own page rather than to an anchor on
// this one. Focus is only moved to the summary when the user has just been
// refused, so a plain visit does not yank the caret out of the page heading.
const partyErrorSummary = (journeyId, partyErrors, disableAutoFocus) =>
  errorSummary(partyErrors, {
    href: (partyId) => changeHref(journeyId, partyId),
    disableAutoFocus
  })

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
    errorSummary: partyErrorSummary(
      journey.journeyId,
      partyErrors,
      disableAutoFocus
    ),
    sections: buildSections(
      answers,
      scope,
      evaluation,
      journey.journeyId,
      readOnly,
      parties,
      partyErrors
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
  const parties = await resolveParties(request, source)
  return renderCya(h, journey, {
    answers,
    scope,
    evaluation,
    readOnly,
    amendmentCancelled: readOnly && request.query.cancelled === '1',
    recoverableError,
    parties,
    partyErrors: readOnly ? {} : outstandingPartyErrors(source, parties),
    disableAutoFocus
  })
}

const get = async (request, h) => renderNotificationView(request, h)

const post = async (request, h) => {
  const { journey, answers, storedAnswers, scope } = await state.get(request, h)
  // Same source as the GET, or the refusal and the page would disagree.
  const source = storedAnswers ?? answers
  const parties = await resolveParties(request, source)
  // A submitted notification is read-only: the GET zeroes its party errors, so
  // the POST must not refuse it either.
  const readOnly = journey.status === state.SUBMITTED
  if (
    !readOnly &&
    Object.keys(outstandingPartyErrors(source, parties)).length > 0
  ) {
    const rendered = await renderNotificationView(request, h, {
      disableAutoFocus: false
    })
    return rendered.code(HTTP_STATUS_BAD_REQUEST)
  }
  return h.redirect(nextInSection(page.id, scope, journey.journeyId))
}

export const routes = pageRoutes(page, { get, post })
