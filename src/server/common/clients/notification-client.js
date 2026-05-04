import { config } from '../../../config/config.js'
import { sessionKeys } from '../constants/session-keys.js'
import { createLogger } from '../helpers/logging/logger.js'
import { getSessionValue, setSessionValue } from '../helpers/session-helpers.js'

const tradeImportsAnimalsBackendUrl = config.get(
  'tradeImportsAnimalsBackendApi.baseUrl'
)
const tracingHeader = config.get('tracing.header')
const logger = createLogger()

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

const getIsoArrivalDate = (arrivalDate) => {
  const { day, month, year } = arrivalDate ?? {}
  return day && month && year
    ? `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    : null
}

const buildOrigin = (request) => {
  const countryCode = getSessionValue(request, sessionKeys.countryCode)
  const requiresRegionCode = getSessionValue(
    request,
    sessionKeys.requiresRegionCode
  )
  const internalReference = getSessionValue(
    request,
    sessionKeys.internalReference
  )

  if (!countryCode && !requiresRegionCode && !internalReference) {
    return undefined
  }

  return {
    ...(countryCode && { countryCode }),
    ...(requiresRegionCode && { requiresRegionCode }),
    ...(internalReference && { internalReference })
  }
}

const buildAdditionalDetails = (request) => {
  const certifiedFor = getSessionValue(request, sessionKeys.certifiedFor)
  const unweanedAnimals = getSessionValue(request, sessionKeys.unweanedAnimals)

  if (!certifiedFor && !unweanedAnimals) {
    return undefined
  }

  return {
    ...(certifiedFor && { certifiedFor }),
    ...(unweanedAnimals && { unweanedAnimals })
  }
}

const buildTransport = (request) => {
  const portOfEntry = getSessionValue(request, sessionKeys.portOfEntry)
  const arrivalDate = getIsoArrivalDate(
    getSessionValue(request, sessionKeys.arrivalDate)
  )

  if (!portOfEntry && !arrivalDate) {
    return undefined
  }

  return {
    ...(portOfEntry && { portOfEntry }),
    ...(arrivalDate && { arrivalDate })
  }
}

const hydrateSessionFromNotification = (request, notification) => {
  if (notification.referenceNumber) {
    setSessionValue(
      request,
      sessionKeys.referenceNumber,
      notification.referenceNumber
    )
  }

  if (notification.origin) {
    if (notification.origin.countryCode) {
      setSessionValue(
        request,
        sessionKeys.countryCode,
        notification.origin.countryCode
      )
    }
    if (notification.origin.requiresRegionCode) {
      setSessionValue(
        request,
        sessionKeys.requiresRegionCode,
        notification.origin.requiresRegionCode
      )
    }
    if (notification.origin.internalReference) {
      setSessionValue(
        request,
        sessionKeys.internalReference,
        notification.origin.internalReference
      )
    }
  }

  if (notification.commodity) {
    setSessionValue(request, sessionKeys.commodity, notification.commodity)
  }

  if (notification.reasonForImport) {
    setSessionValue(
      request,
      sessionKeys.reasonForImport,
      notification.reasonForImport
    )
  }

  if (notification.consignor) {
    setSessionValue(request, sessionKeys.consignor, notification.consignor)
  }

  if (notification.destination) {
    setSessionValue(request, sessionKeys.destination, notification.destination)
  }

  if (notification.cphNumber) {
    setSessionValue(request, sessionKeys.cphNumber, notification.cphNumber)
  }

  if (notification.transport) {
    if (notification.transport.portOfEntry) {
      setSessionValue(
        request,
        sessionKeys.portOfEntry,
        notification.transport.portOfEntry
      )
    }
    if (notification.transport.arrivalDate) {
      if (ISO_DATE_REGEX.test(notification.transport.arrivalDate)) {
        const [year, month, day] = notification.transport.arrivalDate.split('-')
        setSessionValue(request, sessionKeys.arrivalDate, {
          day: Number(day),
          month: Number(month),
          year: Number(year)
        })
      } else {
        logger.warn(
          `Skipping arrivalDate hydration: malformed value "${String(notification.transport.arrivalDate).slice(0, 32)}" (referenceNumber=${notification.referenceNumber ?? 'unknown'})`
        )
      }
    }
  }
}

export const notificationClient = {
  /**
   * Builds a complete notification object from all session values
   * and submits it to the backend
   */
  async submit(request, traceId) {
    const referenceNumber = getSessionValue(
      request,
      sessionKeys.referenceNumber
    )
    const origin = buildOrigin(request)
    const commodity = getSessionValue(request, sessionKeys.commodity)
    const reasonForImport = getSessionValue(
      request,
      sessionKeys.reasonForImport
    )
    const additionalDetails = buildAdditionalDetails(request)
    const consignor = getSessionValue(request, sessionKeys.consignor)
    const destination = getSessionValue(request, sessionKeys.destination)
    const cphNumber = getSessionValue(request, sessionKeys.cphNumber)
    const transport = buildTransport(request)

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
  async get(request, referenceNumber, traceId) {
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

    hydrateSessionFromNotification(request, notification)

    return notification
  }
}
