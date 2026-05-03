import { createLogger } from '../../../common/helpers/logging/logger.js'
import { getSessionValue } from '../../../common/helpers/session-helpers.js'
import { sessionKeys } from '../../../common/constants/session-keys.js'
import { destinations } from './mock-destinations.js'

const logger = createLogger()

export const destinationsSelectController = {
  get: {
    handler: (request, h) => {
      logger.info(
        `Places of destination: ${getSessionValue(request, sessionKeys.commodity)} selection page`
      )
      const referenceNumber = getSessionValue(
        request,
        sessionKeys.referenceNumber
      )

      return h.view('addresses/destinations/select/index', {
        pageTitle: 'Search for a place of destination',
        heading: 'Address',
        referenceNumber,
        destinations
      })
    }
  }
}
