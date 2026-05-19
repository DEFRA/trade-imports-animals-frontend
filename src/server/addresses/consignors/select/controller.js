import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'
import { createLogger } from '../../../common/helpers/logging/logger.js'
import { getSessionValue } from '../../../common/helpers/session-helpers.js'
import { sessionKeys } from '../../../common/constants/session-keys.js'

const logger = createLogger()

const dirname = path.dirname(fileURLToPath(import.meta.url))
const consignorsAddressesFilePath = path.join(dirname, 'mock-consignors.json')
const consignors = JSON.parse(
  readFileSync(consignorsAddressesFilePath, 'utf-8')
)

export const consignorsSelectController = {
  get: {
    handler(_request, h) {
      const referenceNumber = getSessionValue(
        _request,
        sessionKeys.referenceNumber
      )
      logger.info(`Consignor address: ${referenceNumber} selection page`)

      return h.view('addresses/consignors/select/index', {
        pageTitle: 'Search for an existing consignor or exporter',
        referenceNumber,
        consignors
      })
    }
  }
}
