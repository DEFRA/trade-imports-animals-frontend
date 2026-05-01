import { config } from '../../../config/config.js'
import { createLogger } from '../helpers/logging/logger.js'
import { getSessionValue, setSessionValue } from '../helpers/session-helpers.js'

const tradeImportsAnimalsBackendUrl = config.get(
  'tradeImportsAnimalsBackendApi.baseUrl'
)
const tracingHeader = config.get('tracing.header')
const logger = createLogger()

function getIsoArrivalDate(arrivalDate) {
  const { day, month, year } = arrivalDate ?? {}
  return day && month && year
    ? `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    : null
}

function buildOrigin(request) {
  const countryCode = getSessionValue(request, 'countryCode')
  const requiresRegionCode = getSessionValue(request, 'requiresRegionCode')
  const internalReference = getSessionValue(request, 'internalReference')

  if (!countryCode && !requiresRegionCode && !internalReference) {
    return undefined
  }

  return {
    ...(countryCode && { countryCode }),
    ...(requiresRegionCode && { requiresRegionCode }),
    ...(internalReference && { internalReference })
  }
}

function buildAdditionalDetails(request) {
  const certifiedFor = getSessionValue(request, 'certifiedFor')
  const unweanedAnimals = getSessionValue(request, 'unweanedAnimals')

  if (!certifiedFor && !unweanedAnimals) {
    return undefined
  }

  return {
    ...(certifiedFor && { certifiedFor }),
    ...(unweanedAnimals && { unweanedAnimals })
  }
}

function buildTransport(request) {
  const portOfEntry = getSessionValue(request, 'portOfEntry')
  const arrivalDate = getIsoArrivalDate(getSessionValue(request, 'arrivalDate'))

  if (!portOfEntry && !arrivalDate) {
    return undefined
  }

  return {
    ...(portOfEntry && { portOfEntry }),
    ...(arrivalDate && { arrivalDate })
  }
}

export const notificationClient = {
  /**
   * Builds a complete notification object from all session values
   * and submits it to the backend
   */
  async submit(_request, traceId) {
    const referenceNumber = getSessionValue(_request, 'referenceNumber')
    const origin = buildOrigin(_request)
    const commodity = getSessionValue(_request, 'commodity')
    const reasonForImport = getSessionValue(_request, 'reasonForImport')
    const additionalDetails = buildAdditionalDetails(_request)
    const consignor = getSessionValue(_request, 'consignor')
    const destination = getSessionValue(_request, 'destination')
    const cphNumber = getSessionValue(_request, 'cphNumber')
    const transport = buildTransport(_request)

    const notification = {
      ...(referenceNumber && { referenceNumber }),
      ...(origin && { origin }),
      ...(commodity && { commodity }),
      ...(reasonForImport && { reasonForImport }),
      ...(additionalDetails && { additionalDetails }),
      ...(consignor && { consignor }),
      ...(destination && { destination }),
      ...(cphNumber && { cphNumber }),
      ...(transport && { transport })
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
      `${tradeImportsAnimalsBackendUrl}/notifications/${referenceNumber}`,
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

    if (notification.consignor) {
      setSessionValue(_request, 'consignor', notification.consignor)
    }

    if (notification.destination) {
      setSessionValue(_request, 'destination', notification.destination)
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
