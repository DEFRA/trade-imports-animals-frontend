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
    return 1
  }

  return Math.min(Math.max(page, 1), totalPages)
}

export const DEFAULT_NOTIFICATION_SORT = 'arrivalDate,desc'

export const NOTIFICATION_SORT_OPTIONS = [
  { value: 'arrivalDate,desc', text: 'Arrival (newest to oldest)' },
  { value: 'arrivalDate,asc', text: 'Arrival (oldest to newest)' },
  { value: 'createdAt,desc', text: 'Date created (newest to oldest)' },
  { value: 'createdAt,asc', text: 'Date created (oldest to newest)' }
]

export function parseNotificationSort(sortQuery) {
  const isValidSortOption = NOTIFICATION_SORT_OPTIONS.some(
    (option) => option.value === sortQuery
  )

  return isValidSortOption ? sortQuery : DEFAULT_NOTIFICATION_SORT
}

export function buildHomeListQueryString({
  referenceNumber,
  page = 1,
  sort = DEFAULT_NOTIFICATION_SORT
} = {}) {
  const params = new URLSearchParams()

  if (page > 1) {
    params.set('page', String(page))
  }

  if (sort && sort !== DEFAULT_NOTIFICATION_SORT) {
    params.set('sort', sort)
  }

  if (referenceNumber) {
    params.set('referenceNumber', referenceNumber)
  }

  const query = params.toString()
  return query ? `?${query}` : ''
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
  const page = normalizePageNumber(responseBody?.page ?? 1, totalPages)

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
export function buildPaginationLinks(
  pagination,
  referenceNumber,
  sort = DEFAULT_NOTIFICATION_SORT,
  baseUrl = '/'
) {
  const { totalPages } = pagination
  const page = normalizePageNumber(pagination.page, totalPages)

  if (totalPages <= 1) {
    return null
  }

  const model = {}

  if (page > 1) {
    const previousPage = page - 1
    model.previous = {
      href: `${baseUrl}${buildHomeListQueryString({ page: previousPage, sort, referenceNumber })}`,
      label: 'Previous page',
      pageText: `${previousPage} of ${totalPages}`
    }
  }

  if (page < totalPages) {
    const nextPage = page + 1
    model.next = {
      href: `${baseUrl}${buildHomeListQueryString({ page: nextPage, sort, referenceNumber })}`,
      label: 'Next page',
      pageText: `${nextPage} of ${totalPages}`
    }
  }

  return model
}

/**
 * Builds a dashboard notification results range label for the current page, e.g.
 * eg: "Showing 1 to 25 of 75 results".
 */
export function buildPageResultsRangeLabel(
  { size, page = 1, totalElements = 0, totalPages = 1 } = {},
  itemCount = 0
) {
  if (totalElements === 0 || itemCount === 0) {
    return 'No Results'
  }
  const pageSize = size ?? itemCount
  const start = (page - 1) * pageSize + 1
  const end = Math.min(start + itemCount - 1, totalElements)
  if (totalElements === 1) {
    return 'Showing 1 Results'
  }
  if (start === end) {
    return `Showing ${start} of ${totalElements} Results`
  }
  return `Showing ${start} to ${end} of ${totalElements} Results`
}
