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

const logger = createLogger()

const VIEW_NAME = 'import-reason/index'
const PAGE_TITLE = 'Reason for import'
const HEADING = PAGE_TITLE
const SUBMIT_ERROR_MESSAGE =
  'Something went wrong, please contact the EUDP team'

export const importReasonController = {
  get: {
    async handler(_request, h) {
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
    async handler(_request, h) {
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
            errorList: [{ text: SUBMIT_ERROR_MESSAGE }]
          })
          .code(statusCodes.internalServerError)
      }

      return h.redirect('/commodities/details')
    }
  }
}
