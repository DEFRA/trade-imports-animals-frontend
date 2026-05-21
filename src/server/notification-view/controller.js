import { getTraceId } from '@defra/hapi-tracing'
import { notificationClient } from '../common/clients/notification-client.js'
import { createLogger } from '../common/helpers/logging/logger.js'
import { mapNotificationToView } from '../common/helpers/notification-view-helper.js'
import { statusCodes } from '../common/constants/status-codes.js'

const logger = createLogger()

const PAGE_TITLE = 'Notification details'

export const notificationViewController = {
  async handler(request, h) {
    const { referenceNumber } = request.params
    const traceId = getTraceId() ?? ''

    try {
      const notification = await notificationClient.get(
        request,
        referenceNumber,
        traceId
      )
      const viewModel = mapNotificationToView(notification)

      return h.view('notification-view/index', {
        pageTitle: `${referenceNumber} - ${PAGE_TITLE}`,
        ...viewModel
      })
    } catch (err) {
      logger.error(
        `Failed to load notification ${referenceNumber}: ${err.message}`
      )
      return h
        .view('notification-view/index', {
          pageTitle: PAGE_TITLE,
          referenceNumber,
          errorMessage: 'Sorry, there was a problem loading this notification.'
        })
        .code(
          err.status === statusCodes.notFound
            ? statusCodes.notFound
            : statusCodes.internalServerError
        )
    }
  }
}
