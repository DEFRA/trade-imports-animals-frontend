import { createLogger } from '../common/helpers/logging/logger.js'
import {
  setSessionValue,
  getSessionValue
} from '../common/helpers/session-helpers.js'
import { sessionKeys } from '../common/constants/session-keys.js'
import { portOfEntrySchema } from './port-of-entry-schema.js'
import { formatValidationErrors } from '../common/helpers/validation-helpers.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { saveNotification } from '../common/helpers/notification-helpers.js'

const logger = createLogger()

const PAGE_TITLE = 'Entry point and arrival at destination'
const VIEW = 'port-of-entry/index'

export const portOfEntryController = {
  get: {
    handler(_request, h) {
      const portOfEntry = getSessionValue(_request, sessionKeys.portOfEntry)
      const arrivalDate = getSessionValue(_request, sessionKeys.arrivalDate)
      const referenceNumber = getSessionValue(
        _request,
        sessionKeys.referenceNumber
      )

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
      const referenceNumber = getSessionValue(
        _request,
        sessionKeys.referenceNumber
      )

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
      setSessionValue(_request, sessionKeys.portOfEntry, portOfEntry)
      setSessionValue(_request, sessionKeys.arrivalDate, arrivalDate)
      logger.info(`Port of entry saved: ${portOfEntry}`)

      try {
        await saveNotification(_request, logger)
      } catch (err) {
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

      return h.redirect('/transporters', { referenceNumber })
    }
  }
}
