import { createLogger } from '../common/helpers/logging/logger.js'
import { cancelAmendNotification } from '../common/helpers/notification-helpers.js'
import { statusCodes } from '../common/constants/status-codes.js'

const logger = createLogger()

const CONFIRMATION_VIEW = 'notification-cancel-amend/index'
const PAGE_TITLE = 'Cancel amendment'

export const notificationCancelAmendController = {
  get: {
    handler(request, h) {
      const { referenceNumber } = request.params

      return h.view(CONFIRMATION_VIEW, {
        pageTitle: PAGE_TITLE,
        referenceNumber
      })
    }
  },
  post: {
    async handler(request, h) {
      const { referenceNumber } = request.params

      try {
        await cancelAmendNotification(request, logger, referenceNumber)
        return h.redirect(`/notification-view/${referenceNumber}?cancelled=1`)
      } catch (err) {
        const status =
          err.status === statusCodes.notFound
            ? statusCodes.notFound
            : statusCodes.internalServerError
        return h
          .view(CONFIRMATION_VIEW, {
            pageTitle: PAGE_TITLE,
            referenceNumber,
            errorMessage:
              'Sorry, there was a problem cancelling this amendment.'
          })
          .code(status)
      }
    }
  }
}
