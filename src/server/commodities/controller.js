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

export const commoditiesController = {
  get: {
    async handler(_request, h) {
      logger.info(
        `Commodity in session: ${getSessionValue(_request, 'commodity')}`
      )
      const notification = await fetchNotification(_request, logger)
      const referenceNumber = notification?.referenceNumber ?? null

      return h.view('commodities/index', {
        pageTitle: 'Commodities',
        heading: 'Select a Commodity',
        referenceNumber,
        commodity: getSessionValue(_request, 'commodity')
      })
    }
  },
  post: {
    async handler(_request, h) {
      const { commodity } = _request.payload
      const traceId = getTraceId() ?? ''
      logger.info(`Commodity: ${commodity}`)

      // Store value in session as object so the backend always receives a consistent type
      setSessionValue(_request, 'commodity', { name: commodity })

      await submitNotification(_request, traceId, logger)

      return h.redirect('/commodities/select')
    }
  }
}
