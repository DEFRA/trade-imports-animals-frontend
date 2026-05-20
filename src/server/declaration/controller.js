import { createLogger } from '../common/helpers/logging/logger.js'
import { getSessionValue } from '../common/helpers/session-helpers.js'
import { sessionKeys } from '../common/constants/session-keys.js'
import { declarationSchema } from './declaration-schema.js'
import { formatValidationErrors } from '../common/helpers/validation-helpers.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { SUBMISSION_FAILURE_MESSAGE } from '../common/constants/messages.js'
import { submitNotification } from '../common/helpers/notification-helpers.js'

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
        await submitNotification(_request, logger, referenceNumber)
      } catch {
        return h
          .view(VIEW, {
            pageTitle: PAGE_TITLE,
            referenceNumber,
            submissionDate: getSubmissionDate(),
            errorList: [{ text: SUBMISSION_FAILURE_MESSAGE }]
          })
          .code(statusCodes.internalServerError)
      }

      return h.redirect('/declaration')
    }
  }
}
