import { createLogger } from '../common/helpers/logging/logger.js'
import { getSessionValue } from '../common/helpers/session-helpers.js'
import { sessionKeys } from '../common/constants/session-keys.js'
import { saveNotification } from '../common/helpers/notification-helpers.js'

const logger = createLogger()

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

      const selectedPlaceOfOrigin = getSessionValue(
        _request,
        sessionKeys.placeOfOrigin
      )
      const selectedConsignor = getSessionValue(_request, sessionKeys.consignor)
      const selectedConsignee = getSessionValue(_request, sessionKeys.consignee)
      const selectedImporter = getSessionValue(_request, sessionKeys.importer)
      const selectedDestination = getSessionValue(
        _request,
        sessionKeys.destination
      )
      const selectedCphNumber = getSessionValue(_request, sessionKeys.cphNumber)

      return h.view('addresses/index', {
        pageTitle: 'Addresses',
        referenceNumber,
        selectedPlaceOfOrigin,
        selectedConsignor,
        selectedConsignee,
        selectedImporter,
        selectedDestination,
        selectedCphNumber
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
      } catch {
        // save failed — helper already logged; continue to redirect
      }

      return h.redirect('/port-of-entry', { referenceNumber })
    }
  }
}
