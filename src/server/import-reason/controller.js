import { createLogger } from '../common/helpers/logging/logger.js'
import {
  setSessionValue,
  getSessionValue
} from '../common/helpers/session-helpers.js'
import { getTraceId } from '@defra/hapi-tracing'
import {
  fetchNotification,
  submitNotification
} from '../common/helpers/notification-helpers.js'

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
      const traceId = getTraceId() ?? ''

      const { reasonForImport } = _request.payload
      logger.info(`Reason for import: ${referenceNumber}`)
      setSessionValue(_request, 'reasonForImport', reasonForImport)

      await submitNotification(_request, traceId, logger)

      return h.redirect('/commodities/details')
    }
  }
}
