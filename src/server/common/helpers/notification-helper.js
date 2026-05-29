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

function normalizePageNumber(page, totalPages) {
  if (totalPages <= 0) {
    return 0
  }

  return Math.min(Math.max(page, 0), totalPages - 1)
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
export function mapNotificationToListView(notification, countryMap = {}) {
  const rawOrigin = notification.origin ?? null
  const origin = rawOrigin
    ? { ...rawOrigin, countryName: countryMap[rawOrigin.countryCode] }
    : null
  return {
    referenceNumber: notification.referenceNumber ?? '',
    commodity: formatCommodity(notification.commodity),
    origin,
    arrivalAtDestination: formatDisplayDate(getArrivalDateIso(notification)),
    consignor: notification.consignor ?? null,
    status: notification.status ?? 'DRAFT',
    dateCreated: formatDisplayDate(
      notification.createdAt ?? notification.dateCreated ?? notification.created
    )
  }
}

export function mapNotificationsToList(responseBody, countryMap = {}) {
  return normalizeNotificationsResponse(responseBody).map((n) =>
    mapNotificationToListView(n, countryMap)
  )
}

/**
 * Parses a NotificationPageResponse into mapped notifications and pagination metadata.
 */
export function mapPaginatedResponse(responseBody, countryMap = {}) {
  const notifications = normalizeNotificationsResponse(responseBody).map((n) =>
    mapNotificationToListView(n, countryMap)
  )
  const totalPages = responseBody?.totalPages ?? 1
  const page = normalizePageNumber(responseBody?.page ?? 0, totalPages)

  return {
    notifications,
    pagination: {
      page,
      size: responseBody?.size,
      totalElements: responseBody?.totalElements ?? 0,
      totalPages
    }
  }
}

/**
 * Builds the view model for previous/next pagination links.
 * Returns null when there is only a single page.
 */
export function buildPaginationLinks(pagination, baseUrl = '/') {
  const { totalPages } = pagination
  const page = normalizePageNumber(pagination.page, totalPages)

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

/**
 * Builds a dashboard notification results range label for the current page, e.g.
 * eg: "Showing 1 to 25 of 75 results".
 */
export function buildPageResultsRangeLabel(
  { page = 0, size, totalElements = 0, totalPages = 1 } = {},
  itemCount = 0
) {
  if (totalElements === 0 || itemCount === 0) {
    return 'No Results'
  }
  const pageSize = size ?? itemCount
  const start = page * pageSize + 1
  const end = Math.min(start + itemCount - 1, totalElements)
  if (totalElements === 1) {
    return 'Showing 1 Results'
  }
  if (start === end) {
    return `Showing ${start} of ${totalElements} Results`
  }
  return `Showing ${start} to ${end} of ${totalElements} Results`
}
