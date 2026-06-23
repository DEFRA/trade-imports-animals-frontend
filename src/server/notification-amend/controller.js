import { createLogger } from '../common/helpers/logging/logger.js'
import { amendNotification } from '../common/helpers/notification-helpers.js'
import { statusCodes } from '../common/constants/status-codes.js'

const logger = createLogger()

const PAGE_TITLE = 'Notification details'

export const notificationAmendController = {
  async handler(request, h) {
    const { referenceNumber } = request.params

    try {
      await amendNotification(request, logger, referenceNumber)
      return h.redirect(`/notification-view/${referenceNumber}`)
    } catch (err) {
      const status =
        err.status === statusCodes.notFound
          ? statusCodes.notFound
          : statusCodes.internalServerError
      return h
        .view('notification-view/index', {
          pageTitle: PAGE_TITLE,
          referenceNumber,
          errorMessage:
            'Sorry, there was a problem starting an amendment for this notification.'
        })
        .code(status)
    }
  }
}
