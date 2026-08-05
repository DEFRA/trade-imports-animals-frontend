import * as state from '../../../../../../engine/index.js'
import { cancelAmendJourney } from '../../../../../../engine/journey.js'
import { journeyCyaSlug } from '../../../../../../flow/journey-flow.js'
import { HTTP_STATUS_INTERNAL_SERVER_ERROR } from '../../../../../../lib/http-status.js'
import { copyFor } from '../../../../../../shared/copy.js'
import * as kit from '../../../../../../shared/kit.js'
import {
  dashboardPath,
  pagePath,
  pageRoutePath
} from '../../../../../../shared/paths.js'
import { TEMPLATES } from '../../config.js'
import { copy as cy } from './copy/copy.cy.js'
import { copy as en } from './copy/copy.en.js'

const view = `${TEMPLATES}/features/cancel-amend/template`
const copy = copyFor({ en, cy })
const CANCEL_AMEND_SLUG = 'cancel-amend'

const cyaPath = (journeyId) => pagePath(journeyId, journeyCyaSlug())
const cancelPath = (journeyId) => pagePath(journeyId, CANCEL_AMEND_SLUG)

const nonAmendTarget = (journey) =>
  journey.status === state.SUBMITTED
    ? cyaPath(journey.journeyId)
    : dashboardPath()

const render = (h, journey, recoverableError = false) =>
  h.view(view, {
    ...kit.base(copy.title, {
      backLink: cyaPath(journey.journeyId),
      journey,
      recoverableError
    }),
    heading: copy.title,
    copy,
    cancelAction: cancelPath(journey.journeyId),
    noHref: cyaPath(journey.journeyId)
  })

const get = async (request, h) => {
  const { journey } = await state.get(request, h)
  return journey.status === state.AMEND
    ? render(h, journey)
    : h.redirect(nonAmendTarget(journey))
}

const post = async (request, h) => {
  const { journey } = await state.get(request, h)
  if (journey.status !== state.AMEND) {
    return h.redirect(nonAmendTarget(journey))
  }

  const { failure, value: restored } = await kit.recoverableSave(
    () => cancelAmendJourney(request, h, request.params.journeyId),
    () => render(h, journey, true).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
  )
  if (failure) {
    return failure
  }

  return restored
    ? h.redirect(`${cyaPath(restored.journeyId)}?cancelled=1`)
    : h.redirect(dashboardPath())
}

export const routes = [
  {
    method: 'GET',
    path: pageRoutePath(CANCEL_AMEND_SLUG),
    options: kit.routeOptions,
    handler: get
  },
  {
    method: 'POST',
    path: pageRoutePath(CANCEL_AMEND_SLUG),
    options: kit.routeOptions,
    handler: post
  }
]
