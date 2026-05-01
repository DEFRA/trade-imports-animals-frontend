import { createLogger } from '../../../common/helpers/logging/logger.js'
import { getSessionValue } from '../../../common/helpers/session-helpers.js'
import { destinations } from './mock-destinations.js'

const logger = createLogger()

export const destinationsSelectController = {
  get: {
    handler: (request, h) => {
      logger.info(
        `Places of destination: ${getSessionValue(request, 'commodity')} selection page`
      )
      const referenceNumber = getSessionValue(request, 'referenceNumber')

      return h.view('addresses/destinations/select/index', {
        pageTitle: 'Search for a place of destination',
        heading: 'Address',
        referenceNumber,
        destinations
      })
    }
  }
}
