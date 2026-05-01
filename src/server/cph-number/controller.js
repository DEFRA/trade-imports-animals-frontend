import { createLogger } from '../common/helpers/logging/logger.js'
import {
  setSessionValue,
  getSessionValue
} from '../common/helpers/session-helpers.js'
import { cphNumberSchema } from './cph-number-schema.js'
import { formatValidationErrors } from '../common/helpers/validation-helpers.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { sessionKeys } from '../common/constants/session-keys.js'
import { notificationClient } from '../common/clients/notification-client.js'
import { getTraceId } from '@defra/hapi-tracing'

const logger = createLogger()

const VIEW_NAME = 'cph-number/index'
const PAGE_TITLE = 'Add the County Parish Holding number (CPH)'
const HEADING = PAGE_TITLE
const NEXT_PATH = '/port-of-entry'
const SUBMIT_ERROR_MESSAGE =
  'Something went wrong, please contact the EUDP team'

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
    handler(_request, h) {
      const cphNumber = getSessionValue(_request, sessionKeys.cphNumber)
      const referenceNumber = getSessionValue(
        _request,
        sessionKeys.referenceNumber
      )

      return renderView(h, { cphNumber, referenceNumber })
    }
  },
  post: {
    async handler(_request, h) {
      const { cphNumber } = _request.payload
      const traceId = getTraceId() ?? ''
      const referenceNumber = getSessionValue(
        _request,
        sessionKeys.referenceNumber
      )

      const { error } = cphNumberSchema.validate(_request.payload, {
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

      setSessionValue(_request, sessionKeys.cphNumber, cphNumber)
      logger.info(`CPH number saved: ${cphNumber}`)

      try {
        await notificationClient.submit(_request, traceId)
        logger.info('Notification saved successfully')
      } catch (err) {
        logger.error(`Failed to submit notification: ${err.message}`)
        return renderView(h, {
          cphNumber: getSessionValue(_request, sessionKeys.cphNumber),
          referenceNumber,
          errorList: [{ text: SUBMIT_ERROR_MESSAGE }]
        }).code(statusCodes.internalServerError)
      }

      return h.redirect(NEXT_PATH)
    }
  }
}
