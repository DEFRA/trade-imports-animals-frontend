import { randomUUID } from 'node:crypto'
import { breadcrumbs, hubPath, pagePath, TEMPLATES } from '../../config.js'
import { nextInSection } from '../../flow/navigation.js'
import * as state from '../../engine/index.js'
import { journeyStrip, pageRoutes } from '../../shared/kit.js'
import { copyFor } from '../../shared/copy.js'
import { notificationViewPage as page } from './page.js'
import { copy as en } from './copy.en.js'
import { copy as cy } from './copy.cy.js'
import { copy as sharedEn } from '../../shared/copy.en.js'
import { copy as sharedCy } from '../../shared/copy.cy.js'
import { buildSections } from './view-model/index.js'

const view = `${TEMPLATES}/features/check-answers/template`

const copy = copyFor({ en, cy })
const sharedCopy = copyFor({ en: sharedEn, cy: sharedCy })

const renderCya = (
  h,
  journey,
  answers,
  scope,
  evaluation,
  readOnly,
  amendmentCancelled,
  recoverableError = false,
  copyIdempotencyKey = null
) =>
  h.view(view, {
    pageTitle: copy.title,
    heading: copy.title,
    copy,
    sharedCopy,
    journeyStrip: journeyStrip(journey),
    sections: buildSections(
      answers,
      scope,
      evaluation,
      journey.journeyId,
      readOnly
    ),
    readOnly,
    amendmentCancelled,
    recoverableError,
    copyAction:
      readOnly && copyIdempotencyKey
        ? {
            href: pagePath(journey.journeyId, 'copy'),
            idempotencyKey: copyIdempotencyKey
          }
        : null,
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
  { recoverableError = false, copyIdempotencyKey = randomUUID() } = {}
) => {
  const { journey, answers, scope, evaluation } = await state.get(request, h)
  const readOnly = journey.status === state.SUBMITTED
  return renderCya(
    h,
    journey,
    answers,
    scope,
    evaluation,
    readOnly,
    readOnly && request.query.cancelled === '1',
    recoverableError,
    readOnly ? copyIdempotencyKey : null
  )
}

const get = async (request, h) => renderNotificationView(request, h)

const post = async (request, h) => {
  const { scope } = await state.get(request, h)
  return h.redirect(nextInSection(page.id, scope, request.params.journeyId))
}

export const routes = pageRoutes(page, { get, post })
