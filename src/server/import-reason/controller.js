import { createLogger } from '../common/helpers/logging/logger.js'
import {
  setSessionValue,
  getSessionValue
} from '../common/helpers/session-helpers.js'
import { notificationClient } from '../common/clients/notification-client.js'
import { getTraceId } from '@defra/hapi-tracing'
import { statusCodes } from '../common/constants/status-codes.js'

const logger = createLogger()

export const importReasonController = {
  get: {
    handler(_request, h) {
      const reasonForImport = getSessionValue(_request, 'reasonForImport')

      const referenceNumber = getSessionValue(_request, 'referenceNumber')
      const traceId = getTraceId() ?? ''
      if (referenceNumber) {
        notificationClient.get(_request, referenceNumber, traceId)
        logger.info(
          `Notification retrieved from notification client: ${referenceNumber}`
        )
      }

      return h.view('import-reason/index', {
        pageTitle: 'Reason for import',
        heading: 'Reason for import',
        reasonForImport,
        referenceNumber
      })
    }
  },
  post: {
    async handler(_request, h) {
      const referenceNumber = getSessionValue(_request, 'referenceNumber')
      const traceId = getTraceId() ?? ''

      const { reasonForImport } = _request.payload
      logger.info(`Reason for import: ${referenceNumber}`)
      setSessionValue(_request, 'reasonForImport', reasonForImport)

      try {
        // Submit notification - client will build complete notification from all session values
        await notificationClient.submit(_request, traceId)
        logger.info('Notification saved successfully')
      } catch (error) {
        logger.error(`Failed to submit notification: ${error.message}`)
        return h
          .view('import-reason/index', {
            pageTitle: 'Reason for import',
            heading: 'Reason for import',
            reasonForImport: getSessionValue(_request, 'reasonForImport'),
            referenceNumber,
            errorList: [
              { text: 'Something went wrong, please contact the EUDP team' }
            ]
          })
          .code(statusCodes.internalServerError)
      }

      return h.redirect('/commodities/details', { referenceNumber })
    }
  }
}
