import { createLogger } from '../common/helpers/logging/logger.js'
import {
  setSessionValue,
  getSessionValue
} from '../common/helpers/session-helpers.js'
import { sessionKeys } from '../common/constants/session-keys.js'
import { notificationClient } from '../common/clients/notification-client.js'
import { getTraceId } from '@defra/hapi-tracing'
import { statusCodes } from '../common/constants/status-codes.js'

const logger = createLogger()

export const commoditiesController = {
  get: {
    handler(_request, h) {
      logger.info(
        `Commodity in session: ${getSessionValue(_request, sessionKeys.commodity)}`
      )
      const referenceNumber = getSessionValue(
        _request,
        sessionKeys.referenceNumber
      )
      const traceId = getTraceId() ?? ''
      if (referenceNumber) {
        notificationClient.get(_request, referenceNumber, traceId)
        logger.info(
          `Notification retrieved from notification client: ${referenceNumber}`
        )
      }

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
      const traceId = getTraceId() ?? ''
      logger.info(`Commodity: ${commodity}`)

      // Store value in session as object so the backend always receives a consistent type
      setSessionValue(_request, sessionKeys.commodity, { name: commodity })

      try {
        // Submit notification - client will build complete notification from all session values
        await notificationClient.save(_request, traceId)
        logger.info('Notification saved successfully')
      } catch (error) {
        logger.error(`Failed to submit notification: ${error.message}`)
        return h
          .view('commodities/index', {
            pageTitle: 'Commodities',
            heading: 'Select a commodity',
            referenceNumber: getSessionValue(
              _request,
              sessionKeys.referenceNumber
            ),
            commodity: getSessionValue(_request, sessionKeys.commodity),
            errorList: [
              { text: 'Something went wrong, please contact the EUDP team' }
            ]
          })
          .code(statusCodes.internalServerError)
      }

      return h.redirect('/commodities/select')
    }
  }
}
