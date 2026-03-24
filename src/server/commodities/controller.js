import { createLogger } from '../common/helpers/logging/logger.js'
import {
  setSessionValue,
  getSessionValue
} from '../common/helpers/session-helpers.js'
import { notificationClient } from '../common/clients/notification-client.js'
import { getTraceId } from '@defra/hapi-tracing'

const logger = createLogger()

export const commoditiesController = {
  get: {
    handler(_request, h) {
      logger.info(
        `Commodity in session: ${getSessionValue(_request, 'commodity')}`
      )
      const referenceNumber = getSessionValue(_request, 'referenceNumber')
      const traceId = getTraceId() ?? ''
      if (referenceNumber) {
        notificationClient.get(_request, referenceNumber, traceId)
        logger.info(
          `Notification retrieved from notification client: ${referenceNumber}`
        )
      }

      return h.view('commodities/index', {
        pageTitle: 'Commodities',
        heading: 'Select a Commodity',
        referenceNumber: getSessionValue(_request, 'referenceNumber'),
        commodity: getSessionValue(_request, 'commodity')
      })
    }
  },
  post: {
    async handler(_request, h) {
      const { commodity } = _request.payload
      const traceId = getTraceId() ?? ''
      logger.info(`Commodity: ${commodity}`)

      // Store value in session
      setSessionValue(_request, 'commodity', commodity)

      try {
        // Submit notification - client will build complete notification from all session values
        await notificationClient.submit(_request, traceId)
        logger.info('Notification saved successfully')
      } catch (error) {
        logger.error(`Failed to submit notification: ${error.message}`)
      }

      return h.redirect('/commodities/select')
    }
  }
}
