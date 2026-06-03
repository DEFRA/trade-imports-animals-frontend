import { getTraceId } from '@defra/hapi-tracing'
import { notificationClient } from '../common/clients/notification-client.js'
import { createLogger } from '../common/helpers/logging/logger.js'

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
      return h.redirect(`/notification-view/${referenceNumber}?error=copy`)
    }
  }
}
