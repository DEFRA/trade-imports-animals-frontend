import { createLogger } from '../common/helpers/logging/logger.js'
import {
  setSessionValue,
  getSessionValue
} from '../common/helpers/session-helpers.js'
import {
  fetchNotification,
  submitNotification
} from '../common/helpers/notification-helpers.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { sessionKeys } from '../common/constants/session-keys.js'
import { SUBMISSION_FAILURE_MESSAGE } from '../common/constants/messages.js'

const logger = createLogger()

const VIEW_NAME = 'import-reason/index'
const PAGE_TITLE = 'Reason for import'
const HEADING = PAGE_TITLE

export const importReasonController = {
  get: {
    handler: async (_request, h) => {
      const reasonForImport = getSessionValue(
        _request,
        sessionKeys.reasonForImport
      )

      const notification = await fetchNotification(_request, logger)
      const referenceNumber = notification?.referenceNumber ?? null

      return h.view(VIEW_NAME, {
        pageTitle: PAGE_TITLE,
        heading: HEADING,
        reasonForImport,
        referenceNumber
      })
    }
  },
  post: {
    handler: async (_request, h) => {
      const referenceNumber = getSessionValue(
        _request,
        sessionKeys.referenceNumber
      )

      const { reasonForImport } = _request.payload
      logger.info(
        `Reason for import: ${reasonForImport} (ref: ${referenceNumber})`
      )
      setSessionValue(_request, sessionKeys.reasonForImport, reasonForImport)

      try {
        await submitNotification(_request, logger)
      } catch {
        return h
          .view(VIEW_NAME, {
            pageTitle: PAGE_TITLE,
            heading: HEADING,
            reasonForImport,
            referenceNumber,
            errorList: [{ text: SUBMISSION_FAILURE_MESSAGE }]
          })
          .code(statusCodes.internalServerError)
      }

      return h.redirect('/commodities/details')
    }
  }
}
