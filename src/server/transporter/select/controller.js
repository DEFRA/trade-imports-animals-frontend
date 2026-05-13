import { getSessionValue } from '../../common/helpers/session-helpers.js'
import { createLogger } from '../../common/helpers/logging/logger.js'
import { loadMockTransporters } from '../load-mock-transporters.js'

const logger = createLogger()

const transporters = loadMockTransporters()

const PAGE_TITLE = 'Search for an existing transporter'
const VIEW = 'transporter/select/index'

export const transporterSelectController = {
  get: {
    handler(_request, h) {
      const referenceNumber = getSessionValue(_request, 'referenceNumber')
      logger.info(`Transporter: ${referenceNumber} selection page`)

      return h.view(VIEW, {
        pageTitle: PAGE_TITLE,
        referenceNumber,
        transporters
      })
    }
  }
}
