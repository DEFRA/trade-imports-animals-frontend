import { createLogger } from '../common/helpers/logging/logger.js'
import {
  setSessionValue,
  getSessionValue
} from '../common/helpers/session-helpers.js'
import { sessionKeys } from '../common/constants/session-keys.js'
import { portOfEntrySchema } from './port-of-entry-schema.js'
import { formatValidationErrors } from '../common/helpers/validation-helpers.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { SUBMISSION_FAILURE_MESSAGE } from '../common/constants/messages.js'
import { saveNotification } from '../common/helpers/notification-helpers.js'
import { portsOfEntryClient } from '../common/clients/ports-of-entry-client.js'
import { getTraceId } from '@defra/hapi-tracing'

const logger = createLogger()

const PAGE_TITLE = 'Arrival details'
const VIEW = 'port-of-entry/index'

async function buildPortItems(traceId) {
  const ports = await portsOfEntryClient.getPortsOfEntry(traceId)
  return [
    { value: '', text: 'Select port of entry' },
    { text: '──────────', disabled: true },
    ...ports.map(({ code, name }) => ({
      value: code,
      text: `${name} (${code})`
    }))
  ]
}

export const portOfEntryController = {
  get: {
    async handler(_request, h) {
      const portOfEntry = getSessionValue(_request, sessionKeys.portOfEntry)
      const arrivalDate = getSessionValue(_request, sessionKeys.arrivalDate)
      const meansOfTransport = getSessionValue(
        _request,
        sessionKeys.meansOfTransport
      )
      const transportIdentification = getSessionValue(
        _request,
        sessionKeys.transportIdentification
      )
      const transportDocumentReference = getSessionValue(
        _request,
        sessionKeys.transportDocumentReference
      )
      const referenceNumber = getSessionValue(
        _request,
        sessionKeys.referenceNumber
      )
      const traceId = getTraceId() ?? ''
      const portItems = await buildPortItems(traceId)

      return h.view(VIEW, {
        pageTitle: PAGE_TITLE,
        portOfEntry,
        arrivalDate,
        meansOfTransport,
        transportIdentification,
        transportDocumentReference,
        referenceNumber,
        portItems
      })
    }
  },
  post: {
    async handler(_request, h) {
      const portOfEntry = _request.payload.portOfEntry
      const arrivalDay = _request.payload['arrivalDate-day']
      const arrivalMonth = _request.payload['arrivalDate-month']
      const arrivalYear = _request.payload['arrivalDate-year']
      const meansOfTransport = _request.payload.meansOfTransport
      const transportIdentification = _request.payload.transportIdentification
      const transportDocumentReference =
        _request.payload.transportDocumentReference
      const referenceNumber = getSessionValue(
        _request,
        sessionKeys.referenceNumber
      )
      const traceId = getTraceId() ?? ''
      const portItems = await buildPortItems(traceId)

      const { error } = portOfEntrySchema.validate(_request.payload, {
        abortEarly: false
      })

      if (error) {
        const formattedErrors = formatValidationErrors(error)
        return h
          .view(VIEW, {
            pageTitle: PAGE_TITLE,
            portOfEntry,
            arrivalDate: {
              day: arrivalDay,
              month: arrivalMonth,
              year: arrivalYear
            },
            meansOfTransport,
            transportIdentification,
            transportDocumentReference,
            referenceNumber,
            portItems,
            errorList: formattedErrors.errorList,
            fieldErrors: formattedErrors.fieldErrors
          })
          .code(statusCodes.badRequest)
      }

      const arrivalDate = {
        day: arrivalDay,
        month: arrivalMonth,
        year: arrivalYear
      }
      setSessionValue(_request, sessionKeys.portOfEntry, portOfEntry)
      setSessionValue(_request, sessionKeys.arrivalDate, arrivalDate)
      setSessionValue(_request, sessionKeys.meansOfTransport, meansOfTransport)
      setSessionValue(
        _request,
        sessionKeys.transportIdentification,
        transportIdentification
      )
      setSessionValue(
        _request,
        sessionKeys.transportDocumentReference,
        transportDocumentReference
      )
      logger.info(`Port of entry saved: ${portOfEntry}`)

      try {
        await saveNotification(_request, logger)
      } catch {
        return h
          .view(VIEW, {
            pageTitle: PAGE_TITLE,
            portOfEntry,
            arrivalDate,
            meansOfTransport,
            transportIdentification,
            transportDocumentReference,
            referenceNumber,
            portItems,
            errorList: [{ text: SUBMISSION_FAILURE_MESSAGE }]
          })
          .code(statusCodes.internalServerError)
      }

      return h.redirect('/transporters', { referenceNumber })
    }
  }
}
