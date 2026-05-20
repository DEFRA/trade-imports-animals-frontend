import path from 'node:path'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createLogger } from '../common/helpers/logging/logger.js'
import {
  getSessionValue,
  setSessionValue
} from '../common/helpers/session-helpers.js'
import { sessionKeys } from '../common/constants/session-keys.js'
import { saveNotification } from '../common/helpers/notification-helpers.js'

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
        `Addresses: ${getSessionValue(_request, sessionKeys.commodity)} landing page`
      )
      const referenceNumber = getSessionValue(
        _request,
        sessionKeys.referenceNumber
      )
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
        setSessionValue(
          _request,
          sessionKeys.consignor,
          consignors[selectedConsignorId]
        )
      }
      if (
        Number.isInteger(selectedDestinationId) &&
        destinations[selectedDestinationId]
      ) {
        setSessionValue(
          _request,
          sessionKeys.destination,
          destinations[selectedDestinationId]
        )
      }

      const selectedConsignor = getSessionValue(_request, sessionKeys.consignor)
      const selectedDestination = getSessionValue(
        _request,
        sessionKeys.destination
      )

      return h.view('addresses/index', {
        pageTitle: 'Addresses',
        referenceNumber,
        selectedConsignor,
        selectedDestination
      })
    }
  },
  post: {
    async handler(_request, h) {
      logger.info(
        `Addresses: ${getSessionValue(_request, sessionKeys.commodity)} landing page`
      )

      const referenceNumber = getSessionValue(
        _request,
        sessionKeys.referenceNumber
      )

      try {
        await saveNotification(_request, logger)
      } catch (err) {
        // save failed — helper already logged; continue to redirect
      }

      return h.redirect('/cph-number', { referenceNumber })
    }
  }
}
