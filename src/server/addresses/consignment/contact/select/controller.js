import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'
import { createLogger } from '../../../../common/helpers/logging/logger.js'
import {
  getSessionValue,
  setSessionValue
} from '../../../../common/helpers/session-helpers.js'
import { statusCodes } from '../../../../common/constants/status-codes.js'

const logger = createLogger()

const dirname = path.dirname(fileURLToPath(import.meta.url))
const contactsFilePath = path.join(dirname, 'mock-contacts.json')
const contacts = JSON.parse(readFileSync(contactsFilePath, 'utf-8'))

const VIEW = 'addresses/consignment/contact/select/index'
const PAGE_TITLE = 'Contact address for consignment'

export const consignmentContactSelectController = {
  get: {
    handler(_request, h) {
      const referenceNumber = getSessionValue(_request, 'referenceNumber')
      logger.info({ referenceNumber }, 'Contact address: selection page')

      return h.view(VIEW, {
        pageTitle: PAGE_TITLE,
        referenceNumber,
        contacts
      })
    }
  },
  post: {
    handler(_request, h) {
      const referenceNumber = getSessionValue(_request, 'referenceNumber')
      const selectedContactId = Number.parseInt(
        _request.payload?.contactAddress,
        10
      )

      if (
        !Number.isInteger(selectedContactId) ||
        selectedContactId < 0 ||
        !contacts[selectedContactId]
      ) {
        return h
          .view(VIEW, {
            pageTitle: PAGE_TITLE,
            referenceNumber,
            contacts,
            errorList: [
              { text: 'Select a contact address', href: '#contactAddress' }
            ],
            fieldErrors: {
              contactAddress: { text: 'Select a contact address' }
            }
          })
          .code(statusCodes.badRequest)
      }

      setSessionValue(_request, 'contactAddress', contacts[selectedContactId])
      logger.info({ selectedContactId }, 'Contact address selected')
      return h.redirect('/declaration')
    }
  }
}
