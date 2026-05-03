import path from 'node:path'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createLogger } from '../common/helpers/logging/logger.js'
import {
  getSessionValue,
  setSessionValue
} from '../common/helpers/session-helpers.js'
import {
  fetchNotification,
  submitNotification
} from '../common/helpers/notification-helpers.js'
import { sessionKeys } from '../common/constants/session-keys.js'

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

const applySelectedAddress = (request, sessionKey, source, idParam) => {
  const id = Number.parseInt(idParam, 10)
  if (Number.isInteger(id) && source[id]) {
    setSessionValue(request, sessionKey, source[id])
  }
}

export const addressesController = {
  get: {
    async handler(_request, h) {
      logger.info(
        `Addresses: ${getSessionValue(_request, sessionKeys.commodity)} landing page`
      )
      const notification = await fetchNotification(_request, logger)
      const referenceNumber = notification?.referenceNumber

      const {
        selectedConsignor: selectedConsignorParam,
        selectedDestination: selectedDestinationParam
      } = _request.query ?? {}
      applySelectedAddress(
        _request,
        sessionKeys.consignor,
        consignors,
        selectedConsignorParam
      )
      applySelectedAddress(
        _request,
        sessionKeys.destination,
        destinations,
        selectedDestinationParam
      )

      const selectedConsignor = getSessionValue(_request, sessionKeys.consignor)
      const selectedDestination = getSessionValue(
        _request,
        sessionKeys.destination
      )

      return h.view('addresses/index', {
        pageTitle: 'Addresses',
        heading: 'Addresses',
        captionText: 'Notification details',
        referenceNumber,
        selectedConsignor,
        selectedDestination
      })
    }
  },
  post: {
    async handler(_request, h) {
      logger.info(`Addresses POST: form submitted`)

      try {
        await submitNotification(_request, logger)
      } catch {
        // Helper logged the error; allow the user to proceed.
      }

      return h.redirect('/cph-number')
    }
  }
}
