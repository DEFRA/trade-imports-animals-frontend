import { createLogger } from '../common/helpers/logging/logger.js'
import {
  setSessionValue,
  getSessionValue
} from '../common/helpers/session-helpers.js'
import { sessionKeys } from '../common/constants/session-keys.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { SUBMISSION_FAILURE_MESSAGE } from '../common/constants/messages.js'
import { saveNotification } from '../common/helpers/notification-helpers.js'

const logger = createLogger()

export const commoditiesController = {
  get: {
    handler(_request, h) {
      logger.info(
        `Commodity in session: ${getSessionValue(_request, sessionKeys.commodity)}`
      )
      return h.view('commodities/index', {
        pageTitle: 'Commodities',
        heading: 'Select a commodity',
        referenceNumber: getSessionValue(_request, sessionKeys.referenceNumber),
        commodity: getSessionValue(_request, sessionKeys.commodity)
      })
    }
  },
  post: {
    async handler(_request, h) {
      const { commodity } = _request.payload
      logger.info(`Commodity: ${commodity}`)

      // Store value in session as object so the backend always receives a consistent type
      setSessionValue(_request, sessionKeys.commodity, { name: commodity })

      try {
        // Submit notification - client will build complete notification from all session values
        await saveNotification(_request, logger)
      } catch {
        return h
          .view('commodities/index', {
            pageTitle: 'Commodities',
            heading: 'Select a commodity',
            referenceNumber: getSessionValue(
              _request,
              sessionKeys.referenceNumber
            ),
            commodity: getSessionValue(_request, sessionKeys.commodity),
            errorList: [{ text: SUBMISSION_FAILURE_MESSAGE }]
          })
          .code(statusCodes.internalServerError)
      }

      return h.redirect('/commodities/select')
    }
  }
}
