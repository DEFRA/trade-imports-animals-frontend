import * as state from '../../../../../../engine/index.js'
import { softDeleteJourney } from '../../../../../../engine/journey.js'
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

const view = `${TEMPLATES}/features/delete-notification/template`
const copy = copyFor({ en, cy })
const NOTIFICATION_VIEW = 'notification-view'

const returningToNotificationView = (request) =>
  request.query?.source === NOTIFICATION_VIEW

const deletePath = (journeyId, returnToNotificationView) => {
  const path = pagePath(journeyId, 'delete')
  return returnToNotificationView ? `${path}?source=${NOTIFICATION_VIEW}` : path
}

const returnPath = (journeyId, returnToNotificationView) =>
  returnToNotificationView
    ? pagePath(journeyId, 'review-notification')
    : dashboardPath()

const deletable = (journey) =>
  journey.status === state.DRAFT ||
  journey.status === state.SUBMITTED ||
  journey.status === state.AMEND

const render = (request, h, journey, recoverableError = false) => {
  const returnToNotificationView = returningToNotificationView(request)
  const noHref = returnPath(journey.journeyId, returnToNotificationView)

  return h.view(view, {
    ...kit.base(copy.title, {
      backLink: noHref,
      journey,
      recoverableError
    }),
    heading: copy.title,
    copy,
    deleteAction: deletePath(journey.journeyId, returnToNotificationView),
    noHref
  })
}

const get = async (request, h) => {
  const { journey } = await state.get(request, h)
  return deletable(journey)
    ? render(request, h, journey)
    : h.redirect(dashboardPath())
}

const post = async (request, h) => {
  const { journey } = await state.get(request, h)
  if (!deletable(journey)) {
    return h.redirect(dashboardPath())
  }

  const { failure, value: deleted } = await kit.recoverableSave(
    () => softDeleteJourney(request, h, request.params.journeyId),
    () =>
      render(request, h, journey, true).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
  )
  if (failure) {
    return failure
  }

  return deleted
    ? h.redirect(`${dashboardPath()}?deleted=1`)
    : h.redirect(dashboardPath())
}

export const routes = [
  {
    method: 'GET',
    path: pageRoutePath('delete'),
    options: kit.routeOptions,
    handler: get
  },
  {
    method: 'POST',
    path: pageRoutePath('delete'),
    options: kit.routeOptions,
    handler: post
  }
]
