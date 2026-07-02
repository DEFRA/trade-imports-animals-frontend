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
const consignorsFilePath = path.join(dirname, 'mock-consignors.json')
const consignors = JSON.parse(readFileSync(consignorsFilePath, 'utf-8'))

const VIEW = 'addresses/consignors/select/index'
const PAGE_TITLE = 'Search for an existing consignor or exporter'

export const consignorsSelectController = {
  get: {
    handler(_request, h) {
      const referenceNumber = getSessionValue(
        _request,
        sessionKeys.referenceNumber
      )
      logger.info(`Consignor address: ${referenceNumber} selection page`)

      const selectedConsignor = getSessionValue(_request, sessionKeys.consignor)
      const matchedIndex = selectedConsignor
        ? consignors.findIndex((c) => c.name === selectedConsignor.name)
        : -1
      const selectedConsignorId = matchedIndex >= 0 ? matchedIndex : undefined

      return h.view(VIEW, {
        pageTitle: PAGE_TITLE,
        referenceNumber,
        consignors,
        selectedConsignorId
      })
    }
  },
  post: {
    handler(_request, h) {
      const referenceNumber = getSessionValue(
        _request,
        sessionKeys.referenceNumber
      )
      const selectedId = Number.parseInt(_request.payload?.consignor, 10)

      if (
        !Number.isInteger(selectedId) ||
        selectedId < 0 ||
        !consignors[selectedId]
      ) {
        return h
          .view(VIEW, {
            pageTitle: PAGE_TITLE,
            referenceNumber,
            consignors,
            errorList: [
              { text: 'Select a consignor or exporter', href: '#consignor' }
            ],
            fieldErrors: {
              consignor: { text: 'Select a consignor or exporter' }
            }
          })
          .code(statusCodes.badRequest)
      }

      setSessionValue(_request, sessionKeys.consignor, consignors[selectedId])
      logger.info(
        `Consignor saved for ${referenceNumber}: ${consignors[selectedId].name}`
      )
      return h.redirect('/addresses')
    }
  }
}
