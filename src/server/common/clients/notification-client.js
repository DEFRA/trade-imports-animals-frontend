import { config } from '../../../config/config.js'
import { createLogger } from '../helpers/logging/logger.js'
import { getSessionValue, setSessionValue } from '../helpers/session-helpers.js'
import { sessionKeys } from '../constants/session-keys.js'

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

function setOrigin(notification, request) {
  const countryCode = getSessionValue(request, sessionKeys.countryCode)
  const requiresRegionCode = getSessionValue(
    request,
    sessionKeys.requiresRegionCode
  )
  const internalReference = getSessionValue(
    request,
    sessionKeys.internalReference
  )

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
}

function setAdditionalDetails(notification, request) {
  const certifiedFor = getSessionValue(request, sessionKeys.certifiedFor)
  const unweanedAnimals = getSessionValue(request, sessionKeys.unweanedAnimals)

  if (certifiedFor || unweanedAnimals) {
    notification.additionalDetails = {}
    if (certifiedFor) {
      notification.additionalDetails.certifiedFor = certifiedFor
    }
    if (unweanedAnimals) {
      notification.additionalDetails.unweanedAnimals = unweanedAnimals
    }
  }
}

function setAddresses(notification, request) {
  const selectedConsignor = getSessionValue(request, sessionKeys.consignor)
  const selectedDestination = getSessionValue(request, sessionKeys.destination)
  if (selectedConsignor) {
    notification.consignor = selectedConsignor
  }
  if (selectedDestination) {
    notification.destination = selectedDestination
  }
}

function setTransport(notification, request) {
  const portOfEntry = getSessionValue(request, sessionKeys.portOfEntry)
  const arrivalDateIso = getIsoArrivalDate(
    getSessionValue(request, sessionKeys.arrivalDate)
  )

  if (portOfEntry || arrivalDateIso) {
    notification.transport = {}
    if (portOfEntry) {
      notification.transport.portOfEntry = portOfEntry
    }
    if (arrivalDateIso) {
      notification.transport.arrivalDate = arrivalDateIso
    }
  }
}

function setTransporter(notification, request) {
  const transporter = getSessionValue(request, sessionKeys.transporter)
  if (transporter) {
    if (!notification.transport) {
      notification.transport = {}
    }
    notification.transport.transporter = transporter
  }
}

function setConsignmentContactAddress(notification, request) {
  const consignmentContactAddress = getSessionValue(
    request,
    sessionKeys.consignmentContactAddress
  )
  if (consignmentContactAddress) {
    if (!notification.consignment) {
      notification.consignment = {}
    }
    notification.consignment.contact = consignmentContactAddress
  }
}

function buildNotificationPayload(request) {
  const notification = {}

  const referenceNumber = getSessionValue(request, sessionKeys.referenceNumber)
  if (referenceNumber) {
    notification.referenceNumber = referenceNumber
  }

  setOrigin(notification, request)

  const commodity = getSessionValue(request, sessionKeys.commodity)
  if (commodity) {
    notification.commodity = commodity
  }

  const reasonForImport = getSessionValue(request, sessionKeys.reasonForImport)
  if (reasonForImport) {
    notification.reasonForImport = reasonForImport
  }

  setAdditionalDetails(notification, request)
  setAddresses(notification, request)

  const cphNumber = getSessionValue(request, sessionKeys.cphNumber)
  if (cphNumber) {
    notification.cphNumber = cphNumber
  }

  setTransport(notification, request)

  setTransporter(notification, request)

  setConsignmentContactAddress(notification, request)

  return notification
}

function setOriginValues(request, origin) {
  if (origin.countryCode) {
    setSessionValue(request, sessionKeys.countryCode, origin.countryCode)
  }
  if (origin.requiresRegionCode) {
    setSessionValue(
      request,
      sessionKeys.requiresRegionCode,
      origin.requiresRegionCode
    )
  }
  if (origin.internalReference) {
    setSessionValue(
      request,
      sessionKeys.internalReference,
      origin.internalReference
    )
  }
}

function setTransportValues(request, transport) {
  if (transport.portOfEntry) {
    setSessionValue(request, sessionKeys.portOfEntry, transport.portOfEntry)
  }
  if (transport.arrivalDate) {
    const [y, m, d] = transport.arrivalDate.split('-')
    setSessionValue(request, sessionKeys.arrivalDate, {
      day: Number(d),
      month: Number(m),
      year: Number(y)
    })
  }
}

const NOTIFICATION_SESSION_KEYS = [
  sessionKeys.referenceNumber,
  sessionKeys.commodity,
  sessionKeys.reasonForImport,
  sessionKeys.consignor,
  sessionKeys.destination,
  sessionKeys.cphNumber
]

function setNotificationSessionFields(request, notification) {
  for (const key of NOTIFICATION_SESSION_KEYS) {
    const value = notification[key]
    if (value) {
      setSessionValue(request, key, value)
    }
  }
}

function setNotificationSessionValues(request, notification) {
  setNotificationSessionFields(request, notification)
  if (notification.origin) {
    setOriginValues(request, notification.origin)
  }
  if (notification.transport) {
    setTransportValues(request, notification.transport)
  }
  const transporter =
    notification.transport?.transporter ?? notification.transporter
  if (transporter) {
    setSessionValue(request, sessionKeys.transporter, transporter)
  }
  const consignmentContact = notification.consignment?.contact
  if (consignmentContact) {
    setSessionValue(
      request,
      sessionKeys.consignmentContactAddress,
      consignmentContact
    )
  }
}

export const notificationClient = {
  /**
   * Builds a complete notification object from all session values
   * and saves it to the backend
   */
  async save(_request, traceId) {
    const notification = buildNotificationPayload(_request)

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
   * Submits a notification, transitioning its status from DRAFT to SUBMITTED
   */
  async submitNotification(_request, referenceNumber, traceId) {
    const response = await fetch(
      `${tradeImportsAnimalsBackendUrl}/notifications/${referenceNumber}/submit`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [tracingHeader]: traceId
        }
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
    setNotificationSessionValues(_request, notification)

    return notification
  },

  /**
   * Soft-deletes a notification, transitioning its status to DELETED
   */
  async softDelete(_request, referenceNumber, traceId) {
    const response = await fetch(
      `${tradeImportsAnimalsBackendUrl}/notifications/${referenceNumber}/soft-delete`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [tracingHeader]: traceId
        }
      }
    )

    if (!response.ok) {
      const error = new Error('Failed to delete notification')
      error.status = response.status
      error.statusText = response.statusText
      logger.error(`Failed to soft-delete notification: ${error.message}`)
      throw error
    }

    return response.json()
  },

  /**
   * Retrieves a page of notifications from the backend (NotificationPageResponse).
   */
  async findAll(_request, traceId, { page = 1 } = {}) {
    const url = new URL(`${tradeImportsAnimalsBackendUrl}/notifications`)

    if (page > 1) {
      url.searchParams.set('page', page)
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        [tracingHeader]: traceId
      }
    })

    if (!response.ok) {
      const error = new Error('Failed to get notifications')
      error.status = response.status
      error.statusText = response.statusText
      logger.error(`Failed to get notifications: ${error.message}`)
      throw error
    }

    return response.json()
  }
}
