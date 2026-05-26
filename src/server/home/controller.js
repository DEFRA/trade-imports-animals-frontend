import { getTraceId } from '@defra/hapi-tracing'
import { notificationClient } from '../common/clients/notification-client.js'
import { createLogger } from '../common/helpers/logging/logger.js'
import { resetSession } from '../common/helpers/session-helpers.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { mapNotificationsToList } from '../common/helpers/notification-helper.js'
import { parseSort } from '../common/helpers/notification-sort.js'
import { NOTIFICATION_SORT_OPTIONS } from '../common/constants/notification-sort.js'

const logger = createLogger()

const PAGE_TITLE = 'Import notification service'
/**
 * home page controller.
 */
export const homeController = {
  async handler(_request, h) {
    const traceId = getTraceId() ?? ''
    const sort = parseSort(_request.query?.sort)
    let notificationList = []

    try {
      const response = await notificationClient.findAll(_request, traceId, {
        sort
      })
      notificationList = mapNotificationsToList(response)
    } catch (err) {
      logger.error(`Failed to load notifications: ${err.message}`)
      return h
        .view('home/index', {
          pageTitle: PAGE_TITLE,
          heading: PAGE_TITLE,
          notifications: [],
          sort,
          sortOptions: NOTIFICATION_SORT_OPTIONS,
          errorList: [
            { text: 'Something went wrong, please contact the EUDP team' }
          ]
        })
        .code(statusCodes.internalServerError)
    }

    return h.view('home/index', {
      pageTitle: PAGE_TITLE,
      heading: PAGE_TITLE,
      notifications: notificationList,
      sort,
      sortOptions: NOTIFICATION_SORT_OPTIONS
    })
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
