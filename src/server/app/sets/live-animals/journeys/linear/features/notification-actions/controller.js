import { randomUUID } from 'node:crypto'

import {
  dashboardPath,
  hubPath,
  pageRoutePath
} from '../../../../../../shared/paths.js'
import { copyJourney } from '../../../../../../engine/journey.js'
import {
  HTTP_STATUS_INTERNAL_SERVER_ERROR,
  HTTP_STATUS_UNPROCESSABLE_ENTITY
} from '../../../../../../lib/http-status.js'
import * as kit from '../../../../../../shared/kit.js'
import { renderNotificationView } from '../check-answers/controller.js'
import { renderDashboard } from '../dashboard/controller.js'

const recoverCopy = (
  request,
  h,
  idempotencyKey,
  { recoverableError = false, copyIdempotencyError = false } = {}
) =>
  request.payload?.copyOrigin === 'notification-view'
    ? renderNotificationView(request, h, {
        recoverableError,
        copyIdempotencyError,
        copyIdempotencyKey: idempotencyKey
      })
    : renderDashboard(request, h, {
        recoverableError,
        copyIdempotencyError,
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
      (
        await recoverCopy(request, h, idempotencyKey, {
          recoverableError: true
        })
      ).code(HTTP_STATUS_INTERNAL_SERVER_ERROR),
    async () =>
      (
        await recoverCopy(request, h, randomUUID(), {
          copyIdempotencyError: true
        })
      ).code(HTTP_STATUS_UNPROCESSABLE_ENTITY)
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
