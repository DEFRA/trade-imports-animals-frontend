import { format, isValid, parseISO } from 'date-fns'

const LIST_DATE_FORMAT = 'd MMM yyyy'

function formatDisplayDate(value) {
  if (!value) {
    return ''
  }

  const date = typeof value === 'string' ? parseISO(value) : value
  return isValid(date) ? format(date, LIST_DATE_FORMAT) : ''
}

function formatCommodity(commodity) {
  if (!commodity) {
    return ''
  }

  return commodity
}

function getArrivalDateIso(notification) {
  return notification.transport?.arrivalDate ?? notification.arrivalDate ?? null
}

export function normalizeNotificationsResponse(responseBody) {
  if (Array.isArray(responseBody)) {
    return responseBody
  }

  if (Array.isArray(responseBody?.notifications)) {
    return responseBody.notifications
  }

  if (Array.isArray(responseBody?.content)) {
    return responseBody.content
  }

  return []
}

/**
 * Maps a backend notification to a flat view model for the dashboard notification list.
 */
export function mapNotificationToListView(notification) {
  return {
    referenceNumber: notification.referenceNumber ?? '',
    commodity: formatCommodity(notification.commodity),
    origin: notification.origin ?? null,
    arrivalAtDestination: formatDisplayDate(getArrivalDateIso(notification)),
    consignor: notification.consignor ?? null,
    status: notification.status ?? 'DRAFT',
    dateCreated: formatDisplayDate(
      notification.createdAt ?? notification.dateCreated ?? notification.created
    )
  }
}

export function mapNotificationsToList(responseBody) {
  return normalizeNotificationsResponse(responseBody).map(
    mapNotificationToListView
  )
}

/**
 * Parses a NotificationPageResponse into mapped notifications and pagination metadata.
 */
export function mapPaginatedResponse(responseBody) {
  const notifications = normalizeNotificationsResponse(responseBody).map(
    mapNotificationToListView
  )

  return {
    notifications,
    pagination: {
      page: responseBody?.page ?? 0,
      size: responseBody?.size,
      totalElements: responseBody?.totalElements ?? 0,
      totalPages: responseBody?.totalPages ?? 1
    }
  }
}

/**
 * Builds the view model for previous/next pagination links.
 * Returns null when there is only a single page.
 */
export function buildPaginationLinks(pagination, baseUrl = '/') {
  const { page, totalPages } = pagination

  if (totalPages <= 1) {
    return null
  }

  const model = {}

  if (page > 0) {
    const previousPage = page - 1
    model.previous = {
      href: `${baseUrl}?page=${previousPage}`,
      label: 'Previous page',
      pageText: `${previousPage + 1} of ${totalPages}`
    }
  }

  if (page < totalPages - 1) {
    const nextPage = page + 1
    model.next = {
      href: `${baseUrl}?page=${nextPage}`,
      label: 'Next page',
      pageText: `${nextPage + 1} of ${totalPages}`
    }
  }

  return model
}
