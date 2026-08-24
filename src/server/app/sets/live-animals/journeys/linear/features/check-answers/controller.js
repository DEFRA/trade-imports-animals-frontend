import {
  breadcrumbs,
  hubPath,
  pagePath
} from '../../../../../../shared/paths.js'
import { TEMPLATES } from '../../config.js'
import { nextInSection } from '../../../../../../flow/navigation.js'
import * as state from '../../../../../../engine/index.js'
import { journeyStrip, pageRoutes } from '../../../../../../shared/kit.js'
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

const partyErrorSummary = (journeyId, partyErrors) => {
  const entries = Object.entries(partyErrors)
  if (entries.length === 0) {
    return null
  }
  return {
    titleText: sharedCopy.errorSummary.title,
    errorList: entries.map(([partyId, text]) => ({
      text,
      href: changeHref(journeyId, partyId)
    }))
  }
}

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
    partyErrors = {}
  }
) =>
  h.view(view, {
    pageTitle: copy.title,
    heading: copy.title,
    copy,
    sharedCopy,
    concurrencyToken: journey.concurrencyToken,
    journeyStrip: journeyStrip(journey),
    errorSummary: partyErrorSummary(journey.journeyId, partyErrors),
    sections: buildSections(
      answers,
      scope,
      evaluation,
      journey.journeyId,
      readOnly,
      parties
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
    backLink: hubPath(journey.journeyId),
    breadcrumbs: breadcrumbs(journey.journeyId, copy.title)
  })

export const renderNotificationView = async (
  request,
  h,
  { recoverableError = false } = {}
) => {
  const { journey, answers, scope, evaluation } = await state.get(request, h)
  const readOnly = journey.status === state.SUBMITTED
  const parties = await resolveParties(request, answers)
  return renderCya(h, journey, {
    answers,
    scope,
    evaluation,
    readOnly,
    amendmentCancelled: readOnly && request.query.cancelled === '1',
    recoverableError,
    parties,
    partyErrors: readOnly ? {} : outstandingPartyErrors(parties)
  })
}

const get = async (request, h) => renderNotificationView(request, h)

const post = async (request, h) => {
  const { journey, answers, scope } = await state.get(request, h)
  const parties = await resolveParties(request, answers)
  if (Object.keys(outstandingPartyErrors(parties)).length > 0) {
    const rendered = await renderNotificationView(request, h)
    return rendered.code(HTTP_STATUS_BAD_REQUEST)
  }
  return h.redirect(nextInSection(page.id, scope, journey.journeyId))
}

export const routes = pageRoutes(page, { get, post })
