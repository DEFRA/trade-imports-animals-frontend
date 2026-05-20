import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'
import { createLogger } from '../../../../common/helpers/logging/logger.js'
import {
  getSessionValue,
  setSessionValue
} from '../../../../common/helpers/session-helpers.js'
import { sessionKeys } from '../../../../common/constants/session-keys.js'
import { statusCodes } from '../../../../common/constants/status-codes.js'
import { saveNotification } from '../../../../common/helpers/notification-helpers.js'

const logger = createLogger()

const dirname = path.dirname(fileURLToPath(import.meta.url))
const contactsFilePath = path.join(dirname, 'mock-contacts.json')
const contacts = JSON.parse(readFileSync(contactsFilePath, 'utf-8'))

const VIEW = 'addresses/consignment/contact/select/index'
const PAGE_TITLE = 'Contact address for consignment'

export const consignmentContactSelectController = {
  get: {
    handler(_request, h) {
      const referenceNumber = getSessionValue(
        _request,
        sessionKeys.referenceNumber
      )
      logger.info(`Consignment contact selection page: ${referenceNumber}`)

      return h.view(VIEW, {
        pageTitle: PAGE_TITLE,
        referenceNumber,
        contacts
      })
    }
  },
  post: {
    async handler(_request, h) {
      const referenceNumber = getSessionValue(
        _request,
        sessionKeys.referenceNumber
      )
      const selectedContactId = Number.parseInt(
        _request.payload?.contactAddress,
        10
      )

      if (
        !Number.isInteger(selectedContactId) ||
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

      setSessionValue(
        _request,
        sessionKeys.contactAddress,
        contacts[selectedContactId]
      )
      logger.info(
        `${referenceNumber} consignment contact: ${contacts[selectedContactId]}`
      )
      try {
        await saveNotification(_request, logger)
      } catch (err) {
        return h
          .view(VIEW, {
            pageTitle: PAGE_TITLE,
            referenceNumber,
            contacts,
            errorList: [
              { text: 'Something went wrong, please contact the EUDP team' }
            ]
          })
          .code(statusCodes.internalServerError)
      }
      return h.redirect('/declaration')
    }
  }
}
