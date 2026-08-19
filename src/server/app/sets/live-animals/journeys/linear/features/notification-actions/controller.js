import {
  dashboardPath,
  hubPath,
  pagePath,
  pageRoutePath
} from '../../../../../../shared/paths.js'
import { copyJourney } from '../../../../../../engine/journey.js'
import { HTTP_STATUS_INTERNAL_SERVER_ERROR } from '../../../../../../lib/http-status.js'
import * as kit from '../../../../../../shared/kit.js'
import { renderNotificationView } from '../check-answers/controller.js'
import { renderDashboard } from '../dashboard/controller.js'

const originPath = (request) =>
  request.payload?.copyOrigin === 'notification-view'
    ? pagePath(request.params.journeyId, 'check-answers')
    : dashboardPath()

const recoverCopy = (request, h) =>
  request.payload?.copyOrigin === 'notification-view'
    ? renderNotificationView(request, h, { recoverableError: true })
    : renderDashboard(request, h, { recoverableError: true })

const copyPost = async (request, h) => {
  const concurrencyToken =
    request.payload?.concurrencyToken != null
      ? Number(request.payload.concurrencyToken)
      : undefined
  try {
    const { failure, value: copied } = await kit.recoverableSave(
      () => copyJourney(request, h, request.params.journeyId, concurrencyToken),
      async () =>
        (await recoverCopy(request, h)).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
    )
    if (failure) {
      return failure
    }
    return copied
      ? h.redirect(hubPath(copied.journeyId))
      : h.redirect(dashboardPath())
  } catch (error) {
    if (error?.code === 'STALE_CONCURRENCY_TOKEN') {
      return h.redirect(`${originPath(request)}?staleAction=1`)
    }
    throw error
  }
}

export const routes = [
  {
    method: 'POST',
    path: pageRoutePath('copy'),
    options: kit.routeOptions,
    handler: copyPost
  }
]
