import { randomUUID } from 'node:crypto'

import * as state from '../../../../../../engine/index.js'
import { nextInSection } from '../../../../../../flow/navigation.js'
import { copyFor } from '../../../../../../shared/copy.js'
import { copy as sharedCy } from '../../../../../../shared/copy.cy.js'
import { copy as sharedEn } from '../../../../../../shared/copy.en.js'
import { journeyStrip, pageRoutes } from '../../../../../../shared/kit.js'
import {
  breadcrumbs,
  hubPath,
  pagePath
} from '../../../../../../shared/paths.js'
import { TEMPLATES } from '../../config.js'
import { copy as cy } from './copy/copy.cy.js'
import { copy as en } from './copy/copy.en.js'
import { reviewNotificationPage as page } from './page.js'
import { buildSections } from './view-model/index.js'

export const meta = { ...page, collects: [] }

const view = `${TEMPLATES}/features/check-answers/template`
const copy = copyFor({ en, cy })
const sharedCopy = copyFor({ en: sharedEn, cy: sharedCy })

export const renderNotificationView = async (
  request,
  h,
  { recoverableError = false, copyIdempotencyKey = randomUUID() } = {}
) => {
  const { journey, answers, scope, evaluation } = await state.get(request, h)
  const readOnly = journey.status === state.SUBMITTED

  return h.view(view, {
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
    recoverableError,
    copyAction:
      readOnly && copyIdempotencyKey
        ? {
            href: pagePath(journey.journeyId, 'copy'),
            idempotencyKey: copyIdempotencyKey
          }
        : null,
    deleteHref: readOnly
      ? `${pagePath(journey.journeyId, 'delete')}?source=notification-view`
      : null,
    backLink: hubPath(journey.journeyId),
    hubHref: hubPath(journey.journeyId),
    breadcrumbs: breadcrumbs(journey.journeyId, copy.title)
  })
}

const get = async (request, h) => renderNotificationView(request, h)

const post = async (request, h) => {
  const { scope } = await state.get(request, h)
  return h.redirect(nextInSection(page.id, scope, request.params.journeyId))
}

export const routes = pageRoutes(page, { get, post })
