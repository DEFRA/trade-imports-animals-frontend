import { createLogger } from '../common/helpers/logging/logger.js'
import { getSessionValue } from '../common/helpers/session-helpers.js'
import { sessionKeys } from '../common/constants/session-keys.js'
import { declarationSchema } from './declaration-schema.js'
import { formatValidationErrors } from '../common/helpers/validation-helpers.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { notificationClient } from '../common/clients/notification-client.js'
import { getTraceId } from '@defra/hapi-tracing'

const logger = createLogger()

const PAGE_TITLE = 'Declaration'
const VIEW = 'declaration/index'

function getSubmissionDate() {
  return new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

export const declarationController = {
  get: {
    handler(_request, h) {
      const referenceNumber = getSessionValue(
        _request,
        sessionKeys.referenceNumber
      )

      return h.view(VIEW, {
        pageTitle: PAGE_TITLE,
        referenceNumber,
        submissionDate: getSubmissionDate()
      })
    }
  },
  post: {
    async handler(_request, h) {
      const referenceNumber = getSessionValue(
        _request,
        sessionKeys.referenceNumber
      )
      const traceId = getTraceId() ?? ''

      const { error } = declarationSchema.validate(_request.payload, {
        abortEarly: false
      })

      if (error) {
        const formattedErrors = formatValidationErrors(error)
        return h
          .view(VIEW, {
            pageTitle: PAGE_TITLE,
            referenceNumber,
            submissionDate: getSubmissionDate(),
            errorList: formattedErrors.errorList,
            fieldErrors: formattedErrors.fieldErrors
          })
          .code(statusCodes.badRequest)
      }

      try {
        await notificationClient.submitNotification(
          _request,
          referenceNumber,
          traceId
        )
        logger.info(`Notification submitted: ${referenceNumber}`)
      } catch (err) {
        logger.error(`Failed to submit notification: ${err.message}`)
        return h
          .view(VIEW, {
            pageTitle: PAGE_TITLE,
            referenceNumber,
            submissionDate: getSubmissionDate(),
            errorList: [
              { text: 'Something went wrong, please contact the EUDP team' }
            ]
          })
          .code(statusCodes.internalServerError)
      }

      return h.redirect('/declaration')
    }
  }
}
