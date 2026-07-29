import { dashboardPath, hubPath, pageRoutePath } from '../../config.js'
import { copyJourney } from '../../engine/journey.js'
import { HTTP_STATUS_INTERNAL_SERVER_ERROR } from '../../lib/http-status.js'
import * as kit from '../../shared/kit.js'
import { renderNotificationView } from '../check-answers/controller.js'
import { renderDashboard } from '../dashboard/controller.js'

const recoverCopy = (request, h, idempotencyKey) =>
  request.payload?.copyOrigin === 'notification-view'
    ? renderNotificationView(request, h, {
        recoverableError: true,
        copyIdempotencyKey: idempotencyKey
      })
    : renderDashboard(request, h, {
        recoverableError: true,
        retryCopy: {
          journeyId: request.params.journeyId,
          idempotencyKey
        }
      })

const copyPost = async (request, h) => {
  const idempotencyKey = request.payload?.idempotencyKey?.trim()
  const { failure, value: copied } = await kit.recoverableSave(
    () => copyJourney(request, h, request.params.journeyId, idempotencyKey),
    async () =>
      (await recoverCopy(request, h, idempotencyKey)).code(
        HTTP_STATUS_INTERNAL_SERVER_ERROR
      )
  )
  if (failure) return failure

  return copied
    ? h.redirect(hubPath(copied.journeyId))
    : h.redirect(dashboardPath())
}

export const routes = [
  {
    method: 'POST',
    path: pageRoutePath('copy'),
    options: kit.routeOptions,
    handler: copyPost
  }
]
