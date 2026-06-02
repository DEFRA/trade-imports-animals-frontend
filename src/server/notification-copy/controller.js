import { getTraceId } from '@defra/hapi-tracing'
import { notificationClient } from '../common/clients/notification-client.js'
import { createLogger } from '../common/helpers/logging/logger.js'
import { statusCodes } from '../common/constants/status-codes.js'

const logger = createLogger()

export const notificationCopyController = {
  async handler(request, h) {
    const { referenceNumber } = request.params
    const traceId = getTraceId() ?? ''

    try {
      const newNotification = await notificationClient.copy(
        request,
        referenceNumber,
        traceId
      )
      return h.redirect(`/notification-view/${newNotification.referenceNumber}`)
    } catch (err) {
      logger.error({ err, referenceNumber }, 'Failed to copy notification')
      const status =
        err.status === statusCodes.notFound
          ? statusCodes.notFound
          : statusCodes.internalServerError
      return h.response({ error: 'Failed to copy notification' }).code(status)
    }
  }
}
