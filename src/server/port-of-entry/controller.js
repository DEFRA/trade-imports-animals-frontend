import { createLogger } from '../common/helpers/logging/logger.js'
import {
  setSessionValue,
  getSessionValue
} from '../common/helpers/session-helpers.js'
import { portOfEntrySchema } from './port-of-entry-schema.js'
import { formatValidationErrors } from '../common/helpers/validation-helpers.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { notificationClient } from '../common/clients/notification-client.js'
import { getTraceId } from '@defra/hapi-tracing'

const logger = createLogger()

const PAGE_TITLE = 'Entry point and arrival at destination'
const VIEW = 'port-of-entry/index'

export const portOfEntryController = {
  get: {
    handler(_request, h) {
      const portOfEntry = getSessionValue(_request, 'portOfEntry')
      const arrivalDate = getSessionValue(_request, 'arrivalDate')
      const referenceNumber = getSessionValue(_request, 'referenceNumber')

      return h.view(VIEW, {
        pageTitle: PAGE_TITLE,
        portOfEntry,
        arrivalDate,
        referenceNumber
      })
    }
  },
  post: {
    async handler(_request, h) {
      const portOfEntry = _request.payload.portOfEntry
      const arrivalDay = _request.payload['arrivalDate-day']
      const arrivalMonth = _request.payload['arrivalDate-month']
      const arrivalYear = _request.payload['arrivalDate-year']
      const traceId = getTraceId() ?? ''
      const referenceNumber = getSessionValue(_request, 'referenceNumber')

      const { error } = portOfEntrySchema.validate(_request.payload, {
        abortEarly: false
      })

      if (error) {
        const formattedErrors = formatValidationErrors(error)
        return h
          .view(VIEW, {
            pageTitle: PAGE_TITLE,
            portOfEntry,
            arrivalDate: {
              day: arrivalDay,
              month: arrivalMonth,
              year: arrivalYear
            },
            referenceNumber,
            errorList: formattedErrors.errorList,
            fieldErrors: formattedErrors.fieldErrors
          })
          .code(statusCodes.badRequest)
      }

      const arrivalDate = {
        day: arrivalDay,
        month: arrivalMonth,
        year: arrivalYear
      }
      setSessionValue(_request, 'portOfEntry', portOfEntry)
      setSessionValue(_request, 'arrivalDate', arrivalDate)
      logger.info(`Port of entry saved: ${portOfEntry}`)

      try {
        await notificationClient.submit(_request, traceId)
        logger.info('Notification saved successfully')
      } catch (err) {
        logger.error(`Failed to submit notification: ${err.message}`)
        return h
          .view(VIEW, {
            pageTitle: PAGE_TITLE,
            portOfEntry,
            arrivalDate,
            referenceNumber,
            errorList: [
              { text: 'Something went wrong, please contact the EUDP team' }
            ]
          })
          .code(statusCodes.internalServerError)
      }

      return h.redirect('/port-of-entry')
    }
  }
}
