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

function readTransportFields(payload) {
  return {
    portOfEntry: payload.portOfEntry,
    arrivalDate: {
      day: payload['arrivalDate-day'],
      month: payload['arrivalDate-month'],
      year: payload['arrivalDate-year']
    },
    meansOfTransport: payload.meansOfTransport,
    transportIdentification: payload.transportIdentification,
    transportDocumentReference: payload.transportDocumentReference
  }
}

function persistTransportFields(_request, fields) {
  setSessionValue(_request, sessionKeys.portOfEntry, fields.portOfEntry)
  setSessionValue(_request, sessionKeys.arrivalDate, fields.arrivalDate)
  setSessionValue(
    _request,
    sessionKeys.meansOfTransport,
    fields.meansOfTransport
  )
  setSessionValue(
    _request,
    sessionKeys.transportIdentification,
    fields.transportIdentification
  )
  setSessionValue(
    _request,
    sessionKeys.transportDocumentReference,
    fields.transportDocumentReference
  )
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
      const fields = readTransportFields(_request.payload)
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
            ...fields,
            referenceNumber,
            portItems,
            errorList: formattedErrors.errorList,
            fieldErrors: formattedErrors.fieldErrors
          })
          .code(statusCodes.badRequest)
      }

      persistTransportFields(_request, fields)
      logger.info(`Port of entry saved: ${fields.portOfEntry}`)

      try {
        await saveNotification(_request, logger)
      } catch {
        return h
          .view(VIEW, {
            pageTitle: PAGE_TITLE,
            ...fields,
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
