import { createLogger } from '../common/helpers/logging/logger.js'
import {
  setSessionValue,
  getSessionValue
} from '../common/helpers/session-helpers.js'
import {
  fetchNotification,
  submitNotification
} from '../common/helpers/notification-helpers.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { SUBMISSION_FAILURE_MESSAGE } from '../common/constants/messages.js'

const logger = createLogger()

export const commoditiesController = {
  get: {
    handler: async (_request, h) => {
      logger.info(
        `Commodity in session: ${getSessionValue(_request, 'commodity')}`
      )
      const notification = await fetchNotification(_request, logger)
      const referenceNumber =
        notification?.referenceNumber ??
        getSessionValue(_request, 'referenceNumber') ??
        null

      return h.view('commodities/index', {
        pageTitle: 'Commodities',
        heading: 'Select a Commodity',
        referenceNumber,
        commodity: getSessionValue(_request, 'commodity')
      })
    }
  },
  post: {
    handler: async (_request, h) => {
      const { commodity } = _request.payload
      logger.info(`Commodity: ${commodity}`)

      // Store value in session as object so the backend always receives a consistent type
      setSessionValue(_request, 'commodity', { name: commodity })

      try {
        await submitNotification(_request, logger)
      } catch {
        return h
          .view('commodities/index', {
            pageTitle: 'Commodities',
            heading: 'Select a Commodity',
            referenceNumber: getSessionValue(_request, 'referenceNumber'),
            commodity: getSessionValue(_request, 'commodity'),
            errorList: [{ text: SUBMISSION_FAILURE_MESSAGE }]
          })
          .code(statusCodes.internalServerError)
      }

      return h.redirect('/commodities/select')
    }
  }
}
