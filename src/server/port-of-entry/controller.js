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
    handler(request, h) {
      const portOfEntry = getSessionValue(request, 'portOfEntry')
      const arrivalDate = getSessionValue(request, 'arrivalDate')
      const referenceNumber = getSessionValue(request, 'referenceNumber')

      return h.view(VIEW, {
        pageTitle: PAGE_TITLE,
        portOfEntry,
        arrivalDate,
        referenceNumber
      })
    }
  },
  post: {
    async handler(request, h) {
      const {
        portOfEntry,
        'arrivalDate-day': arrivalDay,
        'arrivalDate-month': arrivalMonth,
        'arrivalDate-year': arrivalYear
      } = request.payload
      const traceId = getTraceId() ?? ''
      const referenceNumber = getSessionValue(request, 'referenceNumber')

      const { error } = portOfEntrySchema.validate(request.payload, {
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
      setSessionValue(request, 'portOfEntry', portOfEntry)
      setSessionValue(request, 'arrivalDate', arrivalDate)
      logger.info(`Port of entry saved: ${portOfEntry}`)

      try {
        await notificationClient.submit(request, traceId)
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
