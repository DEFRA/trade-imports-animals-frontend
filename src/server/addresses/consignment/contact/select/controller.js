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
import { SUBMISSION_FAILURE_MESSAGE } from '../../../../common/constants/messages.js'
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

      const selectedContact = getSessionValue(
        _request,
        sessionKeys.consignmentContactAddress
      )
      const matchedIndex = selectedContact
        ? contacts.findIndex((c) => c.name === selectedContact.name)
        : -1
      const selectedContactId = matchedIndex >= 0 ? matchedIndex : undefined

      return h.view(VIEW, {
        pageTitle: PAGE_TITLE,
        referenceNumber,
        contacts,
        selectedContactId
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
        sessionKeys.consignmentContactAddress,
        contacts[selectedContactId]
      )
      logger.info(
        `About to save ${referenceNumber} consignment contact post request`
      )
      try {
        await saveNotification(_request, logger)
      } catch {
        return h
          .view(VIEW, {
            pageTitle: PAGE_TITLE,
            referenceNumber,
            contacts,
            errorList: [{ text: SUBMISSION_FAILURE_MESSAGE }]
          })
          .code(statusCodes.internalServerError)
      }
      return h.redirect(`/notification-view/${referenceNumber}`)
    }
  }
}
