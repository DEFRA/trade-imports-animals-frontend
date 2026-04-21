import path from 'node:path'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createLogger } from '../../common/helpers/logging/logger.js'
import {
  getSessionValue,
  setSessionValue
} from '../../common/helpers/session-helpers.js'
import { notificationClient } from '../../common/clients/notification-client.js'
import { getTraceId } from '@defra/hapi-tracing'
import { statusCodes } from '../../common/constants/status-codes.js'

const logger = createLogger()

const dirname = path.dirname(fileURLToPath(import.meta.url))
const consignorsAddressesFilePath = path.join(
  dirname,
  './select/mock-consignors.json'
)
const consignors = JSON.parse(
  readFileSync(consignorsAddressesFilePath, 'utf-8')
)

export const consignorAddressController = {
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
      if (
        Number.isInteger(selectedConsignorId) &&
        consignors[selectedConsignorId]
      ) {
        setSessionValue(_request, 'consignor', consignors[selectedConsignorId])
      }

      const selectedConsignor = getSessionValue(_request, 'consignor')

      return h.view('consignor/address/index', {
        pageTitle: 'Addresses',
        heading: 'Addresses',
        referenceNumber,
        selectedConsignor
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
      const selectedConsignor = getSessionValue(_request, 'consignor')

      if (!selectedConsignor) {
        return h
          .view('consignor/address/index', {
            pageTitle: 'Addresses',
            heading: 'Addresses',
            referenceNumber,
            selectedConsignor: null,
            errorList: [
              {
                text: 'Select a consignor or exporter',
                href: '#addConsignorOrExporter'
              }
            ]
          })
          .code(statusCodes.badRequest)
      }

      try {
        await notificationClient.submit(_request, traceId)
        logger.info('Notification saved successfully')
      } catch (err) {
        logger.error(`Failed to submit notification: ${err.message}`)
        return h
          .view('consignor/address/index', {
            pageTitle: 'Addresses',
            heading: 'Addresses',
            selectedConsignor: getSessionValue(_request, 'consignor'),
            referenceNumber,
            errorList: [
              { text: 'Something went wrong, please contact the EUDP team' }
            ]
          })
          .code(statusCodes.internalServerError)
      }

      return h.redirect('/consignor/address', { referenceNumber })
    }
  }
}
