import { createLogger } from '../common/helpers/logging/logger.js'
import { getSessionValue } from '../common/helpers/session-helpers.js'
import { notificationClient } from '../common/clients/notification-client.js'
import { getTraceId } from '@defra/hapi-tracing'
import { statusCodes } from '../common/constants/status-codes.js'

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

      const traceId = getTraceId() ?? ''

      try {
        await notificationClient.submit(_request, traceId)
        logger.info('Notification saved successfully')
      } catch (error) {
        logger.error(`Failed to submit notification: ${error.message}`)
        return h
          .view('addresses/index', {
            pageTitle: 'Addresses',
            heading: 'Addresses',
            referenceNumber: getSessionValue(_request, 'referenceNumber'),
            errorList: [
              { text: 'Something went wrong, please contact the EUDP team' }
            ]
          })
          .code(statusCodes.internalServerError)
      }

      return h.redirect('/cph-number')
    }
  }
}
