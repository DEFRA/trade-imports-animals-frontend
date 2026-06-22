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
const placeOfOriginsFilePath = path.join(dirname, 'mock-place-of-origins.json')
const placeOfOrigins = JSON.parse(readFileSync(placeOfOriginsFilePath, 'utf-8'))

const VIEW = 'addresses/place-of-origin/select/index'
const PAGE_TITLE = 'Search for a place of origin'

export const placeOfOriginSelectController = {
  get: {
    handler(_request, h) {
      const referenceNumber = getSessionValue(
        _request,
        sessionKeys.referenceNumber
      )
      logger.info(`Place of origin selection page: ${referenceNumber}`)

      const selectedPlaceOfOrigin = getSessionValue(
        _request,
        sessionKeys.placeOfOrigin
      )
      const matchedIndex = selectedPlaceOfOrigin
        ? placeOfOrigins.findIndex((p) => p.name === selectedPlaceOfOrigin.name)
        : -1
      const selectedPlaceOfOriginId =
        matchedIndex >= 0 ? matchedIndex : undefined

      return h.view(VIEW, {
        pageTitle: PAGE_TITLE,
        referenceNumber,
        placeOfOrigins,
        selectedPlaceOfOriginId
      })
    }
  },
  post: {
    handler(_request, h) {
      const referenceNumber = getSessionValue(
        _request,
        sessionKeys.referenceNumber
      )
      const selectedId = Number.parseInt(_request.payload?.placeOfOrigin, 10)

      if (
        !Number.isInteger(selectedId) ||
        selectedId < 0 ||
        !placeOfOrigins[selectedId]
      ) {
        return h
          .view(VIEW, {
            pageTitle: PAGE_TITLE,
            referenceNumber,
            placeOfOrigins,
            errorList: [
              { text: 'Select a place of origin', href: '#placeOfOrigin' }
            ],
            fieldErrors: {
              placeOfOrigin: { text: 'Select a place of origin' }
            }
          })
          .code(statusCodes.badRequest)
      }

      setSessionValue(
        _request,
        sessionKeys.placeOfOrigin,
        placeOfOrigins[selectedId]
      )
      logger.info(
        `Place of origin saved for ${referenceNumber}: ${placeOfOrigins[selectedId].name}`
      )
      return h.redirect('/addresses')
    }
  }
}
