import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'
import { createLogger } from '../../../common/helpers/logging/logger.js'
import { getSessionValue } from '../../../common/helpers/session-helpers.js'

const logger = createLogger()

const dirname = path.dirname(fileURLToPath(import.meta.url))
const destinationsAddressesFilePath = path.join(
  dirname,
  'mock-destinations.json'
)
const destinations = JSON.parse(
  readFileSync(destinationsAddressesFilePath, 'utf-8')
)

export const destinationsSelectController = {
  get: {
    handler: (request, h) => {
      logger.info(
        `Places of destination: ${getSessionValue(request, 'commodity')} selection page`
      )
      const referenceNumber = getSessionValue(request, 'referenceNumber')

      return h.view('addresses/destinations/select/index', {
        pageTitle: 'Search for a place of destination',
        heading: 'Address',
        referenceNumber,
        destinations
      })
    }
  }
}
