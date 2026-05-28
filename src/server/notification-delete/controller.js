import { createLogger } from '../common/helpers/logging/logger.js'
import { deleteNotification } from '../common/helpers/notification-helpers.js'
import { statusCodes } from '../common/constants/status-codes.js'

const logger = createLogger()

export const notificationDeleteController = {
  options: {
    plugins: {
      crumb: { restful: true }
    }
  },
  async handler(request, h) {
    const { referenceNumber } = request.params

    try {
      await deleteNotification(request, logger, referenceNumber)
      return h.response({ deleted: true }).code(statusCodes.ok)
    } catch (err) {
      const status =
        err.status === statusCodes.notFound
          ? statusCodes.notFound
          : statusCodes.internalServerError
      return h.response({ error: 'Failed to delete notification' }).code(status)
    }
  }
}
