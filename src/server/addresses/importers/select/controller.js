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
const importersFilePath = path.join(dirname, 'mock-importers.json')
const importers = JSON.parse(readFileSync(importersFilePath, 'utf-8'))

const VIEW = 'addresses/importers/select/index'
const PAGE_TITLE = 'Search for an importer'

export const importersSelectController = {
  get: {
    handler(_request, h) {
      const referenceNumber = getSessionValue(
        _request,
        sessionKeys.referenceNumber
      )
      logger.info(`Importer selection page: ${referenceNumber}`)

      const selectedImporter = getSessionValue(_request, sessionKeys.importer)
      const matchedIndex = selectedImporter
        ? importers.findIndex((i) => i.name === selectedImporter.name)
        : -1
      const selectedImporterId = matchedIndex >= 0 ? matchedIndex : undefined

      return h.view(VIEW, {
        pageTitle: PAGE_TITLE,
        referenceNumber,
        importers,
        selectedImporterId
      })
    }
  },
  post: {
    handler(_request, h) {
      const referenceNumber = getSessionValue(
        _request,
        sessionKeys.referenceNumber
      )
      const selectedId = Number.parseInt(_request.payload?.importer, 10)

      if (
        !Number.isInteger(selectedId) ||
        selectedId < 0 ||
        !importers[selectedId]
      ) {
        return h
          .view(VIEW, {
            pageTitle: PAGE_TITLE,
            referenceNumber,
            importers,
            errorList: [{ text: 'Select an importer', href: '#importer' }],
            fieldErrors: {
              importer: { text: 'Select an importer' }
            }
          })
          .code(statusCodes.badRequest)
      }

      setSessionValue(_request, sessionKeys.importer, importers[selectedId])
      logger.info(
        `Importer saved for ${referenceNumber}: ${importers[selectedId].name}`
      )
      return h.redirect('/addresses')
    }
  }
}
