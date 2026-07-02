import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'
import { createLogger } from '../../../common/helpers/logging/logger.js'
import {
  getSessionValue,
  setSessionValue
} from '../../../common/helpers/session-helpers.js'
import { sessionKeys } from '../../../common/constants/session-keys.js'
import { statusCodes } from '../../../common/constants/status-codes.js'

const logger = createLogger()

const dirname = path.dirname(fileURLToPath(import.meta.url))
const destinationsFilePath = path.join(dirname, 'mock-destinations.json')
const destinations = JSON.parse(readFileSync(destinationsFilePath, 'utf-8'))

const VIEW = 'addresses/destinations/select/index'
const PAGE_TITLE = 'Search for a place of destination'

export const destinationsSelectController = {
  get: {
    handler(_request, h) {
      const referenceNumber = getSessionValue(
        _request,
        sessionKeys.referenceNumber
      )
      logger.info(
        `Places of destination: ${getSessionValue(_request, sessionKeys.commodity)} selection page`
      )

      const selectedDestination = getSessionValue(
        _request,
        sessionKeys.destination
      )
      const matchedIndex = selectedDestination
        ? destinations.findIndex((d) => d.name === selectedDestination.name)
        : -1
      const selectedDestinationId = matchedIndex >= 0 ? matchedIndex : undefined

      return h.view(VIEW, {
        pageTitle: PAGE_TITLE,
        referenceNumber,
        destinations,
        selectedDestinationId
      })
    }
  },
  post: {
    handler(_request, h) {
      const referenceNumber = getSessionValue(
        _request,
        sessionKeys.referenceNumber
      )
      const selectedId = Number.parseInt(_request.payload?.destination, 10)

      if (
        !Number.isInteger(selectedId) ||
        selectedId < 0 ||
        !destinations[selectedId]
      ) {
        return h
          .view(VIEW, {
            pageTitle: PAGE_TITLE,
            referenceNumber,
            destinations,
            errorList: [
              {
                text: 'Select a place of destination',
                href: '#destination'
              }
            ],
            fieldErrors: {
              destination: { text: 'Select a place of destination' }
            }
          })
          .code(statusCodes.badRequest)
      }

      setSessionValue(
        _request,
        sessionKeys.destination,
        destinations[selectedId]
      )
      logger.info(
        `Destination saved for ${referenceNumber}: ${destinations[selectedId].name}`
      )
      return h.redirect('/addresses')
    }
  }
}
