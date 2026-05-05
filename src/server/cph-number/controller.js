import { createLogger } from '../common/helpers/logging/logger.js'
import {
  setSessionValue,
  getSessionValue
} from '../common/helpers/session-helpers.js'
import { cphNumberSchema } from './cph-number-schema.js'
import { formatValidationErrors } from '../common/helpers/validation-helpers.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { sessionKeys } from '../common/constants/session-keys.js'
import { SUBMISSION_FAILURE_MESSAGE } from '../common/constants/messages.js'
import { notificationClient } from '../common/clients/notification-client.js'
import { getTraceId } from '@defra/hapi-tracing'

const logger = createLogger()

const VIEW_NAME = 'cph-number/index'
const PAGE_TITLE = 'Add the County Parish Holding number (CPH)'
const HEADING = PAGE_TITLE
const NEXT_PATH = '/port-of-entry'

const renderView = (
  h,
  { cphNumber, referenceNumber, errorList, fieldErrors }
) =>
  h.view(VIEW_NAME, {
    pageTitle: PAGE_TITLE,
    heading: HEADING,
    cphNumber,
    referenceNumber,
    ...(errorList !== undefined && { errorList }),
    ...(fieldErrors !== undefined && { fieldErrors })
  })

export const cphNumberController = {
  get: {
    handler: (request, h) => {
      const cphNumber = getSessionValue(request, sessionKeys.cphNumber)
      const referenceNumber = getSessionValue(
        request,
        sessionKeys.referenceNumber
      )

      return renderView(h, { cphNumber, referenceNumber })
    }
  },
  post: {
    handler: async (request, h) => {
      const { cphNumber } = request.payload
      const traceId = getTraceId() ?? ''
      const referenceNumber = getSessionValue(
        request,
        sessionKeys.referenceNumber
      )

      const { error } = cphNumberSchema.validate(request.payload, {
        abortEarly: false
      })

      if (error) {
        const formattedErrors = formatValidationErrors(error)
        return renderView(h, {
          cphNumber,
          referenceNumber,
          errorList: formattedErrors.errorList,
          fieldErrors: formattedErrors.fieldErrors
        }).code(statusCodes.badRequest)
      }

      setSessionValue(request, sessionKeys.cphNumber, cphNumber)
      logger.info(`CPH number saved: ${cphNumber}`)

      try {
        await notificationClient.submit(request, traceId)
        logger.info('Notification saved successfully')
      } catch (err) {
        logger.error(`Failed to submit notification: ${err.message}`)
        return renderView(h, {
          cphNumber,
          referenceNumber,
          errorList: [{ text: SUBMISSION_FAILURE_MESSAGE, href: '#cphNumber' }]
        }).code(statusCodes.internalServerError)
      }

      return h.redirect(NEXT_PATH)
    }
  }
}
