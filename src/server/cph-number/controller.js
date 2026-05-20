import { createLogger } from '../common/helpers/logging/logger.js'
import {
  setSessionValue,
  getSessionValue
} from '../common/helpers/session-helpers.js'
import { sessionKeys } from '../common/constants/session-keys.js'
import { cphNumberSchema } from './cph-number-schema.js'
import { formatValidationErrors } from '../common/helpers/validation-helpers.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { SUBMISSION_FAILURE_MESSAGE } from '../common/constants/messages.js'
import { saveNotification } from '../common/helpers/notification-helpers.js'

const logger = createLogger()

export const cphNumberController = {
  get: {
    handler(_request, h) {
      const cphNumber = getSessionValue(_request, sessionKeys.cphNumber)
      const referenceNumber = getSessionValue(
        _request,
        sessionKeys.referenceNumber
      )

      return h.view('cph-number/index', {
        pageTitle: 'Add the County Parish Holding number (CPH)',
        cphNumber,
        referenceNumber
      })
    }
  },
  post: {
    async handler(_request, h) {
      const { cphNumber } = _request.payload
      const referenceNumber = getSessionValue(
        _request,
        sessionKeys.referenceNumber
      )

      const { error } = cphNumberSchema.validate(_request.payload, {
        abortEarly: false
      })

      if (error) {
        const formattedErrors = formatValidationErrors(error)
        return h
          .view('cph-number/index', {
            pageTitle: 'Add the County Parish Holding number (CPH)',
            cphNumber,
            referenceNumber,
            errorList: formattedErrors.errorList,
            fieldErrors: formattedErrors.fieldErrors
          })
          .code(statusCodes.badRequest)
      }

      setSessionValue(_request, sessionKeys.cphNumber, cphNumber)
      logger.info(`CPH number saved: ${cphNumber}`)

      try {
        await saveNotification(_request, logger)
      } catch (err) {
        return h
          .view('cph-number/index', {
            pageTitle: 'Add the County Parish Holding number (CPH)',
            cphNumber: getSessionValue(_request, sessionKeys.cphNumber),
            referenceNumber,
            errorList: [{ text: SUBMISSION_FAILURE_MESSAGE }]
          })
          .code(statusCodes.internalServerError)
      }

      return h.redirect('/port-of-entry')
    }
  }
}
