import { getTraceId } from '@defra/hapi-tracing'
import { notificationClient } from '../common/clients/notification-client.js'
import { countriesClient } from '../common/clients/countries-client.js'
import { createLogger } from '../common/helpers/logging/logger.js'
import { resetSession } from '../common/helpers/session-helpers.js'
import { statusCodes } from '../common/constants/status-codes.js'
import {
  mapPaginatedResponse,
  buildPaginationLinks,
  buildPageResultsRangeLabel,
  buildHomeListQueryString,
  parseNotificationSort,
  NOTIFICATION_SORT_OPTIONS
} from '../common/helpers/notification-helper.js'

const logger = createLogger()

const VIEW = 'home/index'
const PAGE_TITLE = 'Import notification service'

function parseReferenceNumber(value) {
  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function renderEmptySearchResult(h, { page, sort, referenceNumber }) {
  return h.view(VIEW, {
    pageTitle: PAGE_TITLE,
    heading: PAGE_TITLE,
    notifications: [],
    resultsLabel: 'No notifications found',
    pagination: null,
    currentPage: page,
    sort,
    sortOptions: NOTIFICATION_SORT_OPTIONS,
    referenceNumber,
    listQuerySuffix: buildHomeListQueryString({
      page,
      sort,
      referenceNumber
    })
  })
}

/**
 * home page controller.
 */
export const homeController = {
  async handler(_request, h) {
    const traceId = getTraceId() ?? ''
    const queryPage = Number.parseInt(_request.query.page, 10)
    const page = Number.isNaN(queryPage) ? 1 : queryPage
    const sort = parseNotificationSort(_request.query.sort)
    const referenceNumber = parseReferenceNumber(_request.query.referenceNumber)

    try {
      const [response, countries] = await Promise.all([
        notificationClient.findAll(_request, traceId, {
          page,
          sort,
          ...(referenceNumber ? { referenceNumber } : {})
        }),
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

      const resultsLabel =
        referenceNumber && notifications.length === 0
          ? 'No notifications found'
          : buildPageResultsRangeLabel(pagination, notifications.length)

      return h.view(VIEW, {
        pageTitle: PAGE_TITLE,
        heading: PAGE_TITLE,
        notifications,
        resultsLabel,
        pagination: buildPaginationLinks(pagination, referenceNumber, sort),
        currentPage: pagination.page,
        sort,
        sortOptions: NOTIFICATION_SORT_OPTIONS,
        referenceNumber: referenceNumber ?? '',
        listQuerySuffix: buildHomeListQueryString({
          page: pagination.page,
          sort,
          referenceNumber
        })
      })
    } catch (err) {
      if (referenceNumber && err.status === statusCodes.badRequest) {
        return renderEmptySearchResult(h, {
          page,
          sort,
          referenceNumber
        })
      }

      logger.error({ err, traceId, page }, 'Failed to load notifications')
      return h
        .view(VIEW, {
          pageTitle: PAGE_TITLE,
          heading: PAGE_TITLE,
          notifications: [],
          totalElements: 0,
          currentPage: page,
          referenceNumber: referenceNumber ?? '',
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
