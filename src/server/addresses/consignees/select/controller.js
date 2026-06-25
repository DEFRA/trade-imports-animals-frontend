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
const consigneesFilePath = path.join(dirname, 'mock-consignees.json')
const consignees = JSON.parse(readFileSync(consigneesFilePath, 'utf-8'))

const VIEW = 'addresses/consignees/select/index'
const PAGE_TITLE = 'Search for a consignee'

export const consigneesSelectController = {
  get: {
    handler(_request, h) {
      const referenceNumber = getSessionValue(
        _request,
        sessionKeys.referenceNumber
      )
      logger.info(`Consignee selection page: ${referenceNumber}`)

      const selectedConsignee = getSessionValue(_request, sessionKeys.consignee)
      const matchedIndex = selectedConsignee
        ? consignees.findIndex((c) => c.name === selectedConsignee.name)
        : -1
      const selectedConsigneeId = matchedIndex >= 0 ? matchedIndex : undefined

      return h.view(VIEW, {
        pageTitle: PAGE_TITLE,
        referenceNumber,
        consignees,
        selectedConsigneeId
      })
    }
  },
  post: {
    handler(_request, h) {
      const referenceNumber = getSessionValue(
        _request,
        sessionKeys.referenceNumber
      )
      const selectedId = Number.parseInt(_request.payload?.consignee, 10)

      if (
        !Number.isInteger(selectedId) ||
        selectedId < 0 ||
        !consignees[selectedId]
      ) {
        return h
          .view(VIEW, {
            pageTitle: PAGE_TITLE,
            referenceNumber,
            consignees,
            errorList: [{ text: 'Select a consignee', href: '#consignee' }],
            fieldErrors: {
              consignee: { text: 'Select a consignee' }
            }
          })
          .code(statusCodes.badRequest)
      }

      setSessionValue(_request, sessionKeys.consignee, consignees[selectedId])
      logger.info(
        `Consignee saved for ${referenceNumber}: ${consignees[selectedId].name}`
      )
      return h.redirect('/addresses')
    }
  }
}
