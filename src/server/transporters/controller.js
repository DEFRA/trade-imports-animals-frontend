import {
  getSessionValue,
  setSessionValue
} from '../common/helpers/session-helpers.js'
import { sessionKeys } from '../common/constants/session-keys.js'
import { createLogger } from '../common/helpers/logging/logger.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { loadMockTransporters } from './load-mock-transporters.js'
import { saveNotification } from '../common/helpers/notification-helpers.js'

const logger = createLogger()

const PAGE_TITLE = 'Transporter'
const VIEW = 'transporters/index'

const transporters = loadMockTransporters()

export const transportersController = {
  get: {
    handler(_request, h) {
      const referenceNumber = getSessionValue(
        _request,
        sessionKeys.referenceNumber
      )
      logger.info(`Transporter: ${referenceNumber} landing page`)

      const selectedTransporterId = Number.parseInt(
        _request.query?.selectedTransporter,
        10
      )

      if (
        Number.isInteger(selectedTransporterId) &&
        transporters[selectedTransporterId]
      ) {
        setSessionValue(
          _request,
          sessionKeys.transporter,
          transporters[selectedTransporterId]
        )
      }

      const selectedTransporter = getSessionValue(
        _request,
        sessionKeys.transporter
      )

      return h.view(VIEW, {
        pageTitle: PAGE_TITLE,
        referenceNumber,
        selectedTransporter
      })
    }
  },
  post: {
    async handler(_request, h) {
      const referenceNumber = getSessionValue(
        _request,
        sessionKeys.referenceNumber
      )
      logger.info(`Transporter: ${referenceNumber} landing page`)

      try {
        await saveNotification(_request, logger)
      } catch (err) {
        const selectedTransporter = getSessionValue(
          _request,
          sessionKeys.transporter
        )
        return h
          .view(VIEW, {
            pageTitle: PAGE_TITLE,
            referenceNumber,
            selectedTransporter,
            errorList: [
              { text: 'Something went wrong, please contact the EUDP team' }
            ]
          })
          .code(statusCodes.internalServerError)
      }
      return h.redirect('/consignment/contact/select')
    }
  }
}
