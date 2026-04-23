import { config } from '../../../config/config.js'
import { createLogger } from '../helpers/logging/logger.js'
import { getSessionValue, setSessionValue } from '../helpers/session-helpers.js'

const tradeImportsAnimalsBackendUrl = config.get(
  'tradeImportsAnimalsBackendApi.baseUrl'
)
const tracingHeader = config.get('tracing.header')
const logger = createLogger()

export const notificationClient = {
  /**
   * Builds a complete notification object from all session values
   * and submits it to the backend
   */
  async submit(_request, traceId) {
    // Build notification from all session values
    const notification = {}

    // Get reference number if it exists
    const referenceNumber = getSessionValue(_request, 'referenceNumber')
    if (referenceNumber) {
      notification.referenceNumber = referenceNumber
    }

    // Build origin object from session values
    const countryCode = getSessionValue(_request, 'countryCode')
    const requiresRegionCode = getSessionValue(_request, 'requiresRegionCode')
    const internalReference = getSessionValue(_request, 'internalReference')

    if (countryCode || requiresRegionCode || internalReference) {
      notification.origin = {}
      if (countryCode) notification.origin.countryCode = countryCode
      if (requiresRegionCode) {
        notification.origin.requiresRegionCode = requiresRegionCode
      }
      if (internalReference) {
        notification.origin.internalReference = internalReference
      }
    }

    // Get commodity from session
    const commodity = getSessionValue(_request, 'commodity')
    if (commodity) {
      notification.commodity = commodity
    }

    // Get reason for import from session
    const reasonForImport = getSessionValue(_request, 'reasonForImport')
    if (reasonForImport) {
      notification.reasonForImport = reasonForImport
    }

    // Build additional details from session values
    const certifiedFor = getSessionValue(_request, 'certifiedFor')
    const unweanedAnimals = getSessionValue(_request, 'unweanedAnimals')

    if (certifiedFor || unweanedAnimals) {
      notification.additionalDetails = {}
      if (certifiedFor) {
        notification.additionalDetails.certifiedFor = certifiedFor
      }
      if (unweanedAnimals) {
        notification.additionalDetails.unweanedAnimals = unweanedAnimals
      }
    }

    // Get CPH number from session
    const cphNumber = getSessionValue(_request, 'cphNumber')
    if (cphNumber) {
      notification.cphNumber = cphNumber
    }

    // Build transport object from session values
    const portOfEntry = getSessionValue(_request, 'portOfEntry')
    const arrivalDate = getSessionValue(_request, 'arrivalDate')
    const { day, month, year } = arrivalDate ?? {}
    const arrivalDateIso =
      day && month && year
        ? `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        : null
    if (portOfEntry || arrivalDateIso) {
      notification.transport = {}
      if (portOfEntry) notification.transport.portOfEntry = portOfEntry
      if (arrivalDateIso) notification.transport.arrivalDate = arrivalDateIso
    }

    const response = await fetch(
      `${tradeImportsAnimalsBackendUrl}/notifications`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [tracingHeader]: traceId
        },
        body: JSON.stringify(notification)
      }
    )

    if (!response.ok) {
      const error = new Error('Failed to submit notification')
      error.status = response.status
      error.statusText = response.statusText

      logger.error(`Failed to submit notification: ${error.message}`)

      throw error
    }

    return response.json()
  },

  /**
   * Retrieves a notification from the backend and stores all values
   * in individual session keys
   */
  async get(_request, referenceNumber, traceId) {
    const response = await fetch(
      `${tradeImportsAnimalsBackendUrl}/notifications/` + referenceNumber,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          [tracingHeader]: traceId
        }
      }
    )
    if (!response.ok) {
      const error = new Error('Failed to get notification')
      error.status = response.status
      error.statusText = response.statusText

      logger.error(`Failed to get notification: ${error.message}`)

      throw error
    }

    const notification = await response.json()

    // Store all notification values in individual session keys
    if (notification.referenceNumber) {
      setSessionValue(_request, 'referenceNumber', notification.referenceNumber)
    }

    if (notification.origin) {
      if (notification.origin.countryCode) {
        setSessionValue(
          _request,
          'countryCode',
          notification.origin.countryCode
        )
      }
      if (notification.origin.requiresRegionCode) {
        setSessionValue(
          _request,
          'requiresRegionCode',
          notification.origin.requiresRegionCode
        )
      }
      if (notification.origin.internalReference) {
        setSessionValue(
          _request,
          'internalReference',
          notification.origin.internalReference
        )
      }
    }

    if (notification.commodity) {
      setSessionValue(_request, 'commodity', notification.commodity)
    }

    if (notification.reasonForImport) {
      setSessionValue(_request, 'reasonForImport', notification.reasonForImport)
    }

    if (notification.cphNumber) {
      setSessionValue(_request, 'cphNumber', notification.cphNumber)
    }

    if (notification.transport) {
      if (notification.transport.portOfEntry) {
        setSessionValue(
          _request,
          'portOfEntry',
          notification.transport.portOfEntry
        )
      }
      if (notification.transport.arrivalDate) {
        const [y, m, d] = notification.transport.arrivalDate.split('-')
        setSessionValue(_request, 'arrivalDate', {
          day: Number(d),
          month: Number(m),
          year: Number(y)
        })
      }
    }

    return notification
  }
}
