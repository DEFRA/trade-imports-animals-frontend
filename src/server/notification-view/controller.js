import { getTraceId } from '@defra/hapi-tracing'
import { notificationClient } from '../common/clients/notification-client.js'
import { countriesClient } from '../common/clients/countries-client.js'
import { createLogger } from '../common/helpers/logging/logger.js'
import { mapNotificationToView } from '../common/helpers/notification-view-helper.js'
import { statusCodes } from '../common/constants/status-codes.js'

const logger = createLogger()

const PAGE_TITLE = 'Notification details'

export const notificationViewController = {
  async handler(request, h) {
    const { referenceNumber } = request.params
    const traceId = getTraceId() ?? ''

    try {
      const [notification, countries] = await Promise.all([
        notificationClient.get(request, referenceNumber, traceId),
        countriesClient.getCountries(traceId).catch((err) => {
          logger.error(`Failed to load countries: ${err.message}`)
          return []
        })
      ])
      const countryMap = Object.fromEntries(
        countries.map((c) => [c.code, c.name])
      )
      const viewModel = mapNotificationToView(notification, countryMap)

      return h.view('notification-view/index', {
        pageTitle: `${referenceNumber} - ${PAGE_TITLE}`,
        ...viewModel
      })
    } catch (err) {
      logger.error(
        `Failed to load notification ${referenceNumber}: ${err.message}`
      )
      return h
        .view('notification-view/index', {
          pageTitle: PAGE_TITLE,
          referenceNumber,
          errorMessage: 'Sorry, there was a problem loading this notification.'
        })
        .code(
          err.status === statusCodes.notFound
            ? statusCodes.notFound
            : statusCodes.internalServerError
        )
    }
  }
}
