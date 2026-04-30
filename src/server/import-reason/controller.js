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

const logger = createLogger()

export const importReasonController = {
  get: {
    async handler(_request, h) {
      const reasonForImport = getSessionValue(_request, 'reasonForImport')

      const notification = await fetchNotification(_request, logger)
      const referenceNumber = notification?.referenceNumber ?? null

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
      const referenceNumber = getSessionValue(_request, 'referenceNumber')

      const { reasonForImport } = _request.payload
      logger.info(
        `Reason for import: ${reasonForImport} (ref: ${referenceNumber})`
      )
      setSessionValue(_request, 'reasonForImport', reasonForImport)

      try {
        await submitNotification(_request, logger)
      } catch {
        return h
          .view('import-reason/index', {
            pageTitle: 'Reason for import',
            heading: 'Reason for import',
            reasonForImport: getSessionValue(_request, 'reasonForImport'),
            referenceNumber,
            errorList: [
              { text: 'Something went wrong, please contact the EUDP team' }
            ]
          })
          .code(statusCodes.internalServerError)
      }

      return h.redirect('/commodities/details')
    }
  }
}
