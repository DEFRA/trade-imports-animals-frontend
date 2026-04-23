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
const consignors = JSON.parse(
  readFileSync(consignorsAddressesFilePath, 'utf-8')
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
      if (
        Number.isInteger(selectedConsignorId) &&
        consignors[selectedConsignorId]
      ) {
        setSessionValue(_request, 'consignor', consignors[selectedConsignorId])
      }

      const selectedConsignor = getSessionValue(_request, 'consignor')

      return h.view('addresses/index', {
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
