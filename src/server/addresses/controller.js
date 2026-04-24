import { createLogger } from '../common/helpers/logging/logger.js'
import { getSessionValue } from '../common/helpers/session-helpers.js'
import { getTraceId } from '@defra/hapi-tracing'
import {
  fetchNotification,
  submitNotification
} from '../common/helpers/notification-helpers.js'

const logger = createLogger()

export const addressesController = {
  get: {
    async handler(_request, h) {
      logger.info(
        `Addresses: ${getSessionValue(_request, 'commodity')} landing page`
      )
      const notification = await fetchNotification(_request, logger)
      const referenceNumber = notification?.referenceNumber

      return h.view('addresses/index', {
        pageTitle: 'Addresses',
        heading: 'Addresses',
        referenceNumber
      })
    }
  },
  post: {
    async handler(_request, h) {
      logger.info(
        `Addresses: ${getSessionValue(_request, 'commodity')} landing page`
      )

      const traceId = getTraceId() ?? ''

      await submitNotification(_request, traceId, logger)

      return h.redirect('/addresses')
    }
  }
}
