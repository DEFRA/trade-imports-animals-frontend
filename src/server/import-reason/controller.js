import { createLogger } from '../common/helpers/logging/logger.js'
import {
  setSessionValue,
  getSessionValue
} from '../common/helpers/session-helpers.js'
import { sessionKeys } from '../common/constants/session-keys.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { SUBMISSION_FAILURE_MESSAGE } from '../common/constants/messages.js'
import {
  saveNotification,
  fetchNotification
} from '../common/helpers/notification-helpers.js'

const logger = createLogger()

export const importReasonController = {
  get: {
    async handler(_request, h) {
      const reasonForImport = getSessionValue(
        _request,
        sessionKeys.reasonForImport
      )

      await fetchNotification(_request, logger)

      const referenceNumber = getSessionValue(
        _request,
        sessionKeys.referenceNumber
      )

      return h.view('import-reason/index', {
        pageTitle: 'Reason for import',
        heading: 'Reason for import',
        reasonForImport,
        referenceNumber
      })
    }
  },
  post: {
    async handler(_request, h) {
      const referenceNumber = getSessionValue(
        _request,
        sessionKeys.referenceNumber
      )

      const { reasonForImport } = _request.payload
      logger.info(`Reason for import: ${referenceNumber}`)
      setSessionValue(_request, sessionKeys.reasonForImport, reasonForImport)

      try {
        // Submit notification - client will build complete notification from all session values
        await saveNotification(_request, logger)
      } catch {
        return h
          .view('import-reason/index', {
            pageTitle: 'Reason for import',
            heading: 'Reason for import',
            reasonForImport: getSessionValue(
              _request,
              sessionKeys.reasonForImport
            ),
            referenceNumber,
            errorList: [{ text: SUBMISSION_FAILURE_MESSAGE }]
          })
          .code(statusCodes.internalServerError)
      }

      return h.redirect('/commodities/details', { referenceNumber })
    }
  }
}
