import { createLogger } from '../common/helpers/logging/logger.js'
import {
  setSessionValue,
  getSessionValue
} from '../common/helpers/session-helpers.js'
import { cphNumberSchema } from './cph-number-schema.js'
import { formatValidationErrors } from '../common/helpers/validation-helpers.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { notificationClient } from '../common/clients/notification-client.js'
import { getTraceId } from '@defra/hapi-tracing'

const logger = createLogger()

export const cphNumberController = {
  get: {
    handler(_request, h) {
      const cphNumber = getSessionValue(_request, 'cphNumber')
      const referenceNumber = getSessionValue(_request, 'referenceNumber')

      return h.view('cph-number/index', {
        pageTitle: 'Add the County Parish Holding number (CPH)',
        heading: 'Add the County Parish Holding number (CPH)',
        cphNumber,
        referenceNumber
      })
    }
  },
  post: {
    async handler(_request, h) {
      const { cphNumber } = _request.payload
      const traceId = getTraceId() ?? ''
      const referenceNumber = getSessionValue(_request, 'referenceNumber')

      const { error } = cphNumberSchema.validate(_request.payload, {
        abortEarly: false
      })

      if (error) {
        const formattedErrors = formatValidationErrors(error)
        return h
          .view('cph-number/index', {
            pageTitle: 'Add the County Parish Holding number (CPH)',
            heading: 'Add the County Parish Holding number (CPH)',
            cphNumber,
            referenceNumber,
            errorList: formattedErrors.errorList,
            fieldErrors: formattedErrors.fieldErrors
          })
          .code(statusCodes.badRequest)
      }

      setSessionValue(_request, 'cphNumber', cphNumber)
      logger.info(`CPH number saved: ${cphNumber}`)

      try {
        await notificationClient.submit(_request, traceId)
        logger.info('Notification saved successfully')
      } catch (err) {
        logger.error(`Failed to submit notification: ${err.message}`)
        return h
          .view('cph-number/index', {
            pageTitle: 'Add the County Parish Holding number (CPH)',
            heading: 'Add the County Parish Holding number (CPH)',
            cphNumber: getSessionValue(_request, 'cphNumber'),
            referenceNumber,
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
