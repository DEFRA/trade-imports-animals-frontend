import { createLogger } from '../common/helpers/logging/logger.js'
import {
  setSessionValue,
  getSessionValue
} from '../common/helpers/session-helpers.js'
import { portOfEntrySchema } from './port-of-entry-schema.js'
import { formatValidationErrors } from '../common/helpers/validation-helpers.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { sessionKeys } from '../common/constants/session-keys.js'
import { SUBMISSION_FAILURE_MESSAGE } from '../common/constants/messages.js'
import { notificationClient } from '../common/clients/notification-client.js'
import { getTraceId } from '@defra/hapi-tracing'

const logger = createLogger()

const VIEW_NAME = 'port-of-entry/index'
const PAGE_TITLE = 'Entry point and arrival at destination'

const buildArrivalDate = (day, month, year) => ({ day, month, year })

const renderView = (
  h,
  { portOfEntry, arrivalDate, referenceNumber, errorList, fieldErrors }
) =>
  h.view(VIEW_NAME, {
    pageTitle: PAGE_TITLE,
    portOfEntry,
    arrivalDate,
    referenceNumber,
    ...(errorList !== undefined && { errorList }),
    ...(fieldErrors !== undefined && { fieldErrors })
  })

export const portOfEntryController = {
  get: {
    handler: (request, h) => {
      const portOfEntry = getSessionValue(request, sessionKeys.portOfEntry)
      const arrivalDate = getSessionValue(request, sessionKeys.arrivalDate)
      const referenceNumber = getSessionValue(
        request,
        sessionKeys.referenceNumber
      )

      return renderView(h, { portOfEntry, arrivalDate, referenceNumber })
    }
  },
  post: {
    handler: async (request, h) => {
      const {
        portOfEntry,
        'arrivalDate-day': arrivalDay,
        'arrivalDate-month': arrivalMonth,
        'arrivalDate-year': arrivalYear
      } = request.payload
      const traceId = getTraceId() ?? ''
      const referenceNumber = getSessionValue(
        request,
        sessionKeys.referenceNumber
      )
      const arrivalDate = buildArrivalDate(
        arrivalDay,
        arrivalMonth,
        arrivalYear
      )

      const { error } = portOfEntrySchema.validate(request.payload, {
        abortEarly: false
      })

      if (error) {
        const formattedErrors = formatValidationErrors(error)
        return renderView(h, {
          portOfEntry,
          arrivalDate,
          referenceNumber,
          errorList: formattedErrors.errorList,
          fieldErrors: formattedErrors.fieldErrors
        }).code(statusCodes.badRequest)
      }

      setSessionValue(request, sessionKeys.portOfEntry, portOfEntry)
      setSessionValue(request, sessionKeys.arrivalDate, arrivalDate)
      logger.info(`Port of entry saved: ${portOfEntry}`)

      try {
        await notificationClient.submit(request, traceId)
        logger.info('Notification saved successfully')
      } catch (err) {
        logger.error(`Failed to submit notification: ${err.message}`)
        return renderView(h, {
          portOfEntry,
          arrivalDate,
          referenceNumber,
          errorList: [
            { text: SUBMISSION_FAILURE_MESSAGE, href: '#portOfEntry' }
          ]
        }).code(statusCodes.internalServerError)
      }

      return h.redirect('/port-of-entry')
    }
  }
}
