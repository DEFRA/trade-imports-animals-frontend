import path from 'node:path'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createLogger } from '../common/helpers/logging/logger.js'
import {
  getSessionValue,
  setSessionValue
} from '../common/helpers/session-helpers.js'
import { notificationClient } from '../common/clients/notification-client.js'
import { getTraceId } from '@defra/hapi-tracing'

const logger = createLogger()

const dirname = path.dirname(fileURLToPath(import.meta.url))
const consignorsAddressesFilePath = path.join(
  dirname,
  './consignors/select/mock-consignors.json'
)
const destinationsAddressesFilePath = path.join(
  dirname,
  './destinations/select/mock-destinations.json'
)
const consignors = JSON.parse(
  readFileSync(consignorsAddressesFilePath, 'utf-8')
)
const destinations = JSON.parse(
  readFileSync(destinationsAddressesFilePath, 'utf-8')
)

export const addressesController = {
  get: {
    handler(_request, h) {
      logger.info(
        `Addresses: ${getSessionValue(_request, 'commodity')} landing page`
      )
      const referenceNumber = getSessionValue(_request, 'referenceNumber')
      const selectedConsignorId = Number.parseInt(
        _request.query?.selectedConsignor,
        10
      )
      const selectedDestinationId = Number.parseInt(
        _request.query?.selectedDestination,
        10
      )
      if (
        Number.isInteger(selectedConsignorId) &&
        consignors[selectedConsignorId]
      ) {
        setSessionValue(_request, 'consignor', consignors[selectedConsignorId])
      }
      if (
        Number.isInteger(selectedDestinationId) &&
        destinations[selectedDestinationId]
      ) {
        setSessionValue(
          _request,
          'destination',
          destinations[selectedDestinationId]
        )
      }

      const selectedConsignor = getSessionValue(_request, 'consignor')
      const selectedDestination = getSessionValue(_request, 'destination')

      return h.view('addresses/index', {
        pageTitle: 'Addresses',
        heading: 'Addresses',
        referenceNumber,
        selectedConsignor,
        selectedDestination
      })
    }
  },
  post: {
    async handler(_request, h) {
      logger.info(
        `Addresses: ${getSessionValue(_request, 'commodity')} landing page`
      )

      const referenceNumber = getSessionValue(_request, 'referenceNumber')
      const traceId = getTraceId() ?? ''

      try {
        await notificationClient.submit(_request, traceId)
        logger.info('Notification saved successfully')
      } catch (err) {
        logger.error(`Failed to submit notification: ${err.message}`)
      }

      return h.redirect('/cph-number', { referenceNumber })
    }
  }
}
