import { format, isValid, parseISO } from 'date-fns'

const LIST_DATE_FORMAT = 'd MMM yyyy'

export const DEFAULT_NOTIFICATION_SORT = 'arrivalDate,desc'

export const NOTIFICATION_SORT_OPTIONS = [
  { value: 'arrivalDate,desc', text: 'Arrival (newest to oldest)' },
  { value: 'arrivalDate,asc', text: 'Arrival (oldest to newest)' },
  { value: 'createdAt,desc', text: 'Date created (newest to oldest)' },
  { value: 'createdAt,asc', text: 'Date created (oldest to newest)' }
]

export const formatDisplayDate = (value) => {
  if (!value) return ''

  const date = typeof value === 'string' ? parseISO(value) : value
  return isValid(date) ? format(date, LIST_DATE_FORMAT) : ''
}

export const formatCommodity = (commodity, nameForCode = () => undefined) => {
  if (!commodity) return ''

  if (typeof commodity === 'string') {
    return nameForCode(commodity) ?? commodity
  }

  const displayValue =
    commodity.name ??
    commodity.displayName ??
    commodity.text ??
    commodity.commodityCode ??
    commodity.code ??
    commodity.value

  return displayValue ? (nameForCode(displayValue) ?? String(displayValue)) : ''
}

export const getArrivalDateIso = (notification) =>
  notification.transport?.arrivalDate ?? notification.arrivalDate ?? null

export const normalizePageNumber = (
  page,
  totalPages = Number.MAX_SAFE_INTEGER
) => {
  if (!Number.isInteger(page) || page < 1 || totalPages <= 0) return 1
  return Math.min(page, totalPages)
}

export const parseNotificationSort = (sortQuery) =>
  NOTIFICATION_SORT_OPTIONS.some((option) => option.value === sortQuery)
    ? sortQuery
    : DEFAULT_NOTIFICATION_SORT

export const buildHomeListQueryString = ({
  page = 1,
  sort = DEFAULT_NOTIFICATION_SORT
} = {}) => {
  const params = new URLSearchParams()

  if (page > 1) params.set('page', String(page))
  if (sort && sort !== DEFAULT_NOTIFICATION_SORT) params.set('sort', sort)

  const query = params.toString()
  return query ? `?${query}` : ''
}

export const buildPaginationLinks = (
  pagination,
  baseUrl,
  sort = DEFAULT_NOTIFICATION_SORT,
  labels = {}
) => {
  const { totalPages } = pagination
  const page = normalizePageNumber(pagination.page, totalPages)

  if (totalPages <= 1) return null

  return {
    previous:
      page > 1
        ? {
            href: `${baseUrl}${buildHomeListQueryString({
              page: page - 1,
              sort
            })}`,
            text: labels.previous
          }
        : undefined,
    next:
      page < totalPages
        ? {
            href: `${baseUrl}${buildHomeListQueryString({
              page: page + 1,
              sort
            })}`,
            text: labels.next
          }
        : undefined
  }
}

export const buildPageResultsRange = (
  { page = 1, size, totalElements = 0 } = {},
  itemCount = 0
) => {
  if (totalElements === 0 || itemCount === 0) {
    return { start: 0, end: 0, total: totalElements }
  }

  const pageSize = size ?? itemCount
  const start = (page - 1) * pageSize + 1
  return {
    start,
    end: Math.min(start + itemCount - 1, totalElements),
    total: totalElements
  }
}

export const buildPageResultsRangeLabel = (
  pagination,
  itemCount,
  labels = {}
) => {
  const range = buildPageResultsRange(pagination, itemCount)
  if (range.total === 0) return labels.none ?? 'No Results'
  if (range.total === 1) return labels.one ?? 'Showing 1 Results'
  if (range.start === range.end) {
    return labels.oneOf
      ? labels.oneOf(range.start, range.total)
      : `Showing ${range.start} of ${range.total} Results`
  }
  return labels.many
    ? labels.many(range.start, range.end, range.total)
    : `Showing ${range.start} to ${range.end} of ${range.total} Results`
}
