import { getTraceId } from '@defra/hapi-tracing'
import { notificationClient } from '../common/clients/notification-client.js'
import { countriesClient } from '../common/clients/countries-client.js'
import { createLogger } from '../common/helpers/logging/logger.js'
import { resetSession } from '../common/helpers/session-helpers.js'
import { statusCodes } from '../common/constants/status-codes.js'
import {
  mapPaginatedResponse,
  buildPaginationLinks,
  buildPageResultsRangeLabel
} from '../common/helpers/notification-helper.js'

const logger = createLogger()

const PAGE_TITLE = 'Import notification service'

/**
 * home page controller.
 */
export const homeController = {
  async handler(_request, h) {
    const traceId = getTraceId() ?? ''
    const page = Math.max(0, Number.parseInt(_request.query.page, 10) || 0)

    try {
      const [response, countries] = await Promise.all([
        notificationClient.findAll(_request, traceId, { page }),
        countriesClient.getCountries(traceId).catch((err) => {
          logger.error(`Failed to load countries: ${err.message}`)
          return []
        })
      ])
      const countryMap = Object.fromEntries(
        countries.map((c) => [c.code, c.name])
      )
      const { notifications, pagination } = mapPaginatedResponse(
        response,
        countryMap
      )

      return h.view('home/index', {
        pageTitle: PAGE_TITLE,
        heading: PAGE_TITLE,
        notifications,
        resultsLabel: buildPageResultsRangeLabel(
          pagination,
          notifications.length
        ),
        pagination: buildPaginationLinks(pagination),
        currentPage: pagination.page
      })
    } catch (err) {
      logger.error({ err, traceId, page }, 'Failed to load notifications')
      return h
        .view('home/index', {
          pageTitle: PAGE_TITLE,
          heading: PAGE_TITLE,
          notifications: [],
          totalElements: 0,
          currentPage: page,
          errorList: [
            { text: 'Something went wrong, please contact the EUDP team' }
          ]
        })
        .code(statusCodes.internalServerError)
    }
  }
}

/**
 * Controller for starting a new import notification journey.
 * Clears the entire session to ensure no cached data from previous journeys.
 */
export const startJourneyController = {
  handler(_request, h) {
    // Reset the entire session - clears all keys and assigns new session ID
    resetSession(_request)
    return h.redirect('/origin')
  }
}
