import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'
import { createLogger } from '../../../common/helpers/logging/logger.js'
import { getSessionValue } from '../../../common/helpers/session-helpers.js'

const logger = createLogger()

const dirname = path.dirname(fileURLToPath(import.meta.url))
const consignorsAddressesFilePath = path.join(dirname, 'mock-consignors.json')
const consignors = JSON.parse(
  readFileSync(consignorsAddressesFilePath, 'utf-8')
)

export const consignorAddressSelectController = {
  get: {
    handler(_request, h) {
      logger.info(
        `Consignor address: ${getSessionValue(_request, 'commodity')} selection page`
      )
      const referenceNumber = getSessionValue(_request, 'referenceNumber')

      return h.view('consignor/address/select/index', {
        pageTitle: 'Search for an existing consignor or exporter',
        heading: 'Address',
        referenceNumber,
        consignors
      })
    }
  }
}
