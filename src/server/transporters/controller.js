import {
  getSessionValue,
  setSessionValue
} from '../common/helpers/session-helpers.js'
import { notificationClient } from '../common/clients/notification-client.js'
import { getTraceId } from '@defra/hapi-tracing'
import { createLogger } from '../common/helpers/logging/logger.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { loadMockTransporters } from './load-mock-transporters.js'

const logger = createLogger()

const PAGE_TITLE = 'Transporter'
const VIEW = 'transporters/index'

const transporters = loadMockTransporters()

export const transportersController = {
  get: {
    handler(_request, h) {
      const referenceNumber = getSessionValue(_request, 'referenceNumber')
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
          'transporter',
          transporters[selectedTransporterId]
        )
      }

      const selectedTransporter = getSessionValue(_request, 'transporter')

      return h.view(VIEW, {
        pageTitle: PAGE_TITLE,
        referenceNumber,
        selectedTransporter
      })
    }
  },
  post: {
    async handler(_request, h) {
      const referenceNumber = getSessionValue(_request, 'referenceNumber')
      logger.info(`Transporter: ${referenceNumber} landing page`)

      const traceId = getTraceId() ?? ''

      try {
        await notificationClient.save(_request, traceId)
        logger.info('Notification saved successfully')
      } catch (err) {
        logger.error(`Failed to submit notification: ${err.message}`)
        const selectedTransporter = getSessionValue(_request, 'transporter')
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
