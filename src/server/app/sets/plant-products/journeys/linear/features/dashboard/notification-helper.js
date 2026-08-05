import { format, isValid, parseISO } from 'date-fns'

import {
  compose,
  dateParts,
  maxText,
  validate
} from '../../../../../../lib/validate/index.js'

const LIST_DATE_FORMAT = 'd MMMM yyyy'
const DATE_PART_DIGITS = 2
const ISO_DATE_LENGTH = 10
const MAX_KEYWORDS_LENGTH = 255

export const DEFAULT_NOTIFICATION_SORT = 'arrivalDate,desc'

export const NOTIFICATION_SORT_OPTIONS = Object.freeze([
  Object.freeze({ value: 'arrivalDate,desc' }),
  Object.freeze({ value: 'arrivalDate,asc' }),
  Object.freeze({ value: 'createdAt,desc' }),
  Object.freeze({ value: 'createdAt,asc' })
])

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
  NOTIFICATION_SORT_OPTIONS.some(({ value }) => value === sortQuery)
    ? sortQuery
    : DEFAULT_NOTIFICATION_SORT

const appendDateParts = (params, name, value = {}) => {
  for (const part of ['day', 'month', 'year']) {
    const partValue = String(value[part] ?? '').trim()
    if (partValue) {
      params.set(`${name}-${part}`, partValue)
    }
  }
}

export const buildListQueryString = ({
  page = 1,
  sort = DEFAULT_NOTIFICATION_SORT,
  referenceNumber,
  status,
  countryOfOrigin,
  startDate,
  endDate
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
  if (status) {
    params.set('status', status)
  }
  if (countryOfOrigin) {
    params.set('countryOfOrigin', countryOfOrigin)
  }
  appendDateParts(params, 'startDate', startDate)
  appendDateParts(params, 'endDate', endDate)

  const query = params.toString()
  return query ? `?${query}` : ''
}

export const buildPaginationLinks = (
  pagination,
  baseUrl,
  query,
  labels = {}
) => {
  const page = normalizePageNumber(pagination.page, pagination.totalPages)
  if (pagination.totalPages <= 1) {
    return null
  }

  const link = (targetPage) => ({
    href: `${baseUrl}${buildListQueryString({ ...query, page: targetPage })}`
  })

  return {
    previous:
      page > 1 ? { ...link(page - 1), text: labels.previous } : undefined,
    next:
      page < pagination.totalPages
        ? { ...link(page + 1), text: labels.next }
        : undefined
  }
}

export const buildPageResultsRangeLabel = (
  pagination,
  itemCount,
  labels = {}
) => {
  const { page = 1, size, totalElements = 0 } = pagination ?? {}
  if (itemCount === 0) {
    return labels.none ?? '0 results'
  }
  if (totalElements === 1) {
    return labels.single ?? '1 result'
  }

  const start = (page - 1) * (size ?? itemCount) + 1
  const end = Math.min(start + itemCount - 1, totalElements)
  return labels.range
    ? labels.range(start, end, totalElements)
    : `Showing ${start} to ${end} of ${totalElements} results`
}

export const formatDisplayDate = (value) => {
  if (!value) {
    return ''
  }
  const date = typeof value === 'string' ? parseISO(value) : value
  return isValid(date) ? format(date, LIST_DATE_FORMAT) : ''
}

const rawDateParts = (query, name) => ({
  day: String(query?.[`${name}-day`] ?? ''),
  month: String(query?.[`${name}-month`] ?? ''),
  year: String(query?.[`${name}-year`] ?? '')
})

const dateIso = ({ day, month, year }) => {
  const parts = [day, month, year].map((part) => String(part).trim())
  if (parts.some((part) => part === '')) {
    return null
  }
  const [trimmedDay, trimmedMonth, trimmedYear] = parts
  const iso = `${trimmedYear}-${trimmedMonth.padStart(DATE_PART_DIGITS, '0')}-${trimmedDay.padStart(DATE_PART_DIGITS, '0')}`
  return isValid(parseISO(iso)) ? iso : null
}

export const parseDateRangeQuery = (query = {}) => ({
  start: dateIso(rawDateParts(query, 'startDate')),
  end: dateIso(rawDateParts(query, 'endDate'))
})

export const filterValues = (query = {}) => ({
  referenceNumber: String(query.referenceNumber ?? ''),
  status: String(query.status ?? ''),
  countryOfOrigin: String(query.countryOfOrigin ?? ''),
  startDate: rawDateParts(query, 'startDate'),
  endDate: rawDateParts(query, 'endDate')
})

export const validateFilters = (query = {}, messages = {}) => {
  const fields = compose(
    maxText('referenceNumber', MAX_KEYWORDS_LENGTH, messages.keywordsMax),
    dateParts('startDate', messages.startDateReal),
    dateParts('endDate', messages.endDateReal)
  )
  const { errors: validationErrors } = validate(fields, query)
  const errors = { ...(validationErrors ?? {}) }
  const { start, end } = parseDateRangeQuery(query)

  if (!errors['startDate-day'] && !errors['endDate-day'] && start && end) {
    if (start > end) {
      errors['startDate-day'] = messages.startBeforeEnd
    }
  }

  return Object.keys(errors).length > 0 ? errors : null
}

export const applyStatusFilter = (rows, status) =>
  status ? rows.filter((row) => row.status === status) : rows

export const applyCountryFilter = (rows, countryCode) =>
  countryCode
    ? rows.filter((row) => row.originCountryCode === countryCode)
    : rows

export const applyArrivalRangeFilter = (rows, { start, end } = {}) =>
  start || end
    ? rows.filter((row) => {
        const arrival = String(row.arrivalDate ?? '').slice(0, ISO_DATE_LENGTH)
        return (
          arrival !== '' &&
          (!start || arrival >= start) &&
          (!end || arrival <= end)
        )
      })
    : rows
