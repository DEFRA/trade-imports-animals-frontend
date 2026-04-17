import { createLogger } from '../common/helpers/logging/logger.js'
import { getSessionValue } from '../common/helpers/session-helpers.js'
import { notificationClient } from '../common/clients/notification-client.js'
import { getTraceId } from '@defra/hapi-tracing'

const logger = createLogger()

export const addressesController = {
  get: {
    handler(_request, h) {
      logger.info(
        `Addresses: ${getSessionValue(_request, 'commodity')} landing page`
      )
      const referenceNumber = getSessionValue(_request, 'referenceNumber')

      return h.view('addresses/index', {
        pageTitle: 'Addresses',
        heading: 'Addresses',
        referenceNumber
      })
    }
  },
  post: {
    async handler(_request, h) {
      logger.info(
        `Addresses: ${getSessionValue(_request, 'commodity')} landing page`
      )

      const referenceNumber = getSessionValue(_request, 'referenceNumber')
      const traceId = getTraceId() ?? ''

      try {
        await notificationClient.submit(_request, traceId)
        logger.info('Notification saved successfully')
      } catch (error) {
        logger.error(`Failed to submit notification: ${error.message}`)
      }

      return h.redirect('/addresses', { referenceNumber })
    }
  }
}
