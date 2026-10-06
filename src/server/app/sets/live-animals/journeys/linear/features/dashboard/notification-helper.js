import { isValid, parseISO } from 'date-fns'
import {
  formatCalendarDate,
  formatMomentAsDay
} from '../../../../../../lib/validate/index.js'

export const DEFAULT_NOTIFICATION_SORT = 'arrivalDate,desc'

export const NOTIFICATION_SORT_OPTIONS = [
  { value: 'arrivalDate,desc', text: 'Arrival (newest to oldest)' },
  { value: 'arrivalDate,asc', text: 'Arrival (oldest to newest)' },
  { value: 'createdAt,desc', text: 'Date created (newest to oldest)' },
  { value: 'createdAt,asc', text: 'Date created (oldest to newest)' }
]

/** The delimiters date-fns accepts between the date and the time. */
const TIME_DELIMITER = /[T ]/

/** A trailing `Z`, `+01`, `+0100` or `+01:00` on the time part. */
const ZONE_DESIGNATOR = /(?:Z|[+-]\d\d(?::?\d\d)?)$/

/**
 * Labels an ISO string that carries no zone as UTC, so it parses to the value
 * the wire meant rather than to one read off the container's clock. An arrival
 * date arrives date-only, as `2026-07-21`, and parses to a `Date` whose UTC
 * components are that day — what the calendar renderer reads.
 *
 * `parseISO` resolves an offset-less value — a date-only `2026-07-21`, or a
 * `2026-07-14T10:00:00` — against the process zone. Both renderers then read
 * UTC components, so east of UTC the day arrives already shifted back: in a
 * `Europe/London` container during BST, `2026-07-21` renders as `20 Jul 2026`.
 * The zone the process happens to run in is not part of the value.
 *
 * Anything that is not a date at all is left to fail parsing as before.
 * @param {string} value
 * @returns {string} The value with an explicit UTC designator.
 */
const asUtcInstant = (value) => {
  const [, time] = value.split(TIME_DELIMITER)

  if (time === undefined) {
    return `${value}T00:00:00Z`
  }

  return ZONE_DESIGNATOR.test(time) ? value : `${value}Z`
}

const displayDate = (value, formatter) => {
  if (!value) {
    return ''
  }

  const date = typeof value === 'string' ? parseISO(asUtcInstant(value)) : value
  return isValid(date) ? formatter(date) : ''
}

/**
 * A day the user chose — an arrival date. Rendered from its own UTC
 * components, because the value already is the day.
 * @param {string|Date} value
 */
export const formatDisplayCalendarDate = (value) =>
  displayDate(value, formatCalendarDate)

/**
 * A moment that happened — created, submitted. Rendered as the day it
 * happened in the service's zone, not the container's ambient `TZ`, which
 * differs between production, CI and a laptop and can be dropped. Same class
 * of environment dependency EUDPA-282 removed from the backend.
 * @param {string|Date} value
 */
export const formatDisplayMoment = (value) =>
  displayDate(value, formatMomentAsDay)

const commodityDisplayValue = (commodity) =>
  commodity.name ??
  commodity.displayName ??
  commodity.text ??
  commodity.commodityCode ??
  commodity.code ??
  commodity.value

export const formatCommodity = (commodity, nameForCode = () => undefined) => {
  if (!commodity) {
    return ''
  }

  if (typeof commodity === 'string') {
    return nameForCode(commodity) ?? commodity
  }

  const displayValue = commodityDisplayValue(commodity)

  return displayValue ? (nameForCode(displayValue) ?? String(displayValue)) : ''
}

export const getArrivalDateIso = (notification) =>
  notification.transport?.arrivalDate ?? notification.arrivalDate ?? null

export const normalizePageNumber = (
  page,
  totalPages = Number.MAX_SAFE_INTEGER
) => {
  if (!Number.isInteger(page) || page < 1 || totalPages <= 0) {
    return 1
  }
  return Math.min(page, totalPages)
}

export const parseNotificationSort = (sortQuery) =>
  NOTIFICATION_SORT_OPTIONS.some((option) => option.value === sortQuery)
    ? sortQuery
    : DEFAULT_NOTIFICATION_SORT

export const buildHomeListQueryString = ({
  page = 1,
  sort = DEFAULT_NOTIFICATION_SORT,
  referenceNumber
} = {}) => {
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

export const buildPaginationLinks = (
  pagination,
  baseUrl,
  sort,
  labels,
  referenceNumber
) => {
  const sortOrDefault = sort ?? DEFAULT_NOTIFICATION_SORT
  const linkLabels = labels ?? {}
  const { totalPages } = pagination
  const page = normalizePageNumber(pagination.page, totalPages)

  if (totalPages <= 1) {
    return null
  }

  return {
    previous:
      page > 1
        ? {
            href: `${baseUrl}${buildHomeListQueryString({
              page: page - 1,
              sort: sortOrDefault,
              referenceNumber
            })}`,
            text: linkLabels.previous
          }
        : undefined,
    next:
      page < totalPages
        ? {
            href: `${baseUrl}${buildHomeListQueryString({
              page: page + 1,
              sort: sortOrDefault,
              referenceNumber
            })}`,
            text: linkLabels.next
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
  if (range.total === 0) {
    return labels.none ?? 'No Results'
  }
  if (range.total === 1) {
    return labels.one ?? 'Showing 1 Results'
  }
  if (range.start === range.end) {
    return labels.oneOf
      ? labels.oneOf(range.start, range.total)
      : `Showing ${range.start} of ${range.total} Results`
  }
  return labels.many
    ? labels.many(range.start, range.end, range.total)
    : `Showing ${range.start} to ${range.end} of ${range.total} Results`
}
