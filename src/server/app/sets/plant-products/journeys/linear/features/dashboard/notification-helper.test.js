import { describe, expect, it } from 'vitest'

import {
  DEFAULT_NOTIFICATION_SORT,
  NOTIFICATION_SORT_OPTIONS,
  applyArrivalRangeFilter,
  applyCountryFilter,
  applyStatusFilter,
  buildListQueryString,
  buildPageResultsRangeLabel,
  buildPaginationLinks,
  formatDisplayDate,
  normalizePageNumber,
  parseDateRangeQuery,
  parseNotificationSort,
  validateFilters
} from './notification-helper.js'

const messages = {
  keywordsMax: 'keywords max',
  startDateReal: 'start real',
  endDateReal: 'end real',
  startBeforeEnd: 'start before end'
}

describe('dashboard notification helpers', () => {
  it.each([
    [Number.NaN, undefined, 1],
    [0, undefined, 1],
    [-1, undefined, 1],
    [7, 3, 3],
    [2, 3, 2]
  ])('normalizes page %s against %s to %s', (page, totalPages, expected) => {
    expect(normalizePageNumber(page, totalPages)).toBe(expected)
  })

  it('accepts every records sort token and defaults unknown input', () => {
    for (const { value } of NOTIFICATION_SORT_OPTIONS) {
      expect(parseNotificationSort(value)).toBe(value)
    }
    expect(parseNotificationSort('reference,sideways')).toBe(
      DEFAULT_NOTIFICATION_SORT
    )
  })

  it('builds a query-only suffix containing every active list control', () => {
    expect(
      buildListQueryString({
        page: 2,
        sort: 'createdAt,asc',
        referenceNumber: 'GBN-PP-26-ABC123',
        status: 'draft',
        countryOfOrigin: 'IE',
        startDate: { day: '1', month: '2', year: '2026' },
        endDate: { day: '7', month: '3', year: '2026' }
      })
    ).toBe(
      '?page=2&sort=createdAt%2Casc&referenceNumber=GBN-PP-26-ABC123&status=draft&countryOfOrigin=IE&startDate-day=1&startDate-month=2&startDate-year=2026&endDate-day=7&endDate-month=3&endDate-year=2026'
    )
  })

  it('omits defaults and blank filters from the list query', () => {
    expect(
      buildListQueryString({
        page: 1,
        sort: DEFAULT_NOTIFICATION_SORT,
        referenceNumber: '',
        startDate: {}
      })
    ).toBe('')
  })

  it('keeps all filters in prefix-bearing pagination links', () => {
    expect(
      buildPaginationLinks(
        { page: 2, totalPages: 3 },
        '/plant-products',
        { status: 'draft', countryOfOrigin: 'IE' },
        { previous: 'Previous', next: 'Next' }
      )
    ).toEqual({
      previous: {
        href: '/plant-products?status=draft&countryOfOrigin=IE',
        text: 'Previous'
      },
      next: {
        href: '/plant-products?page=3&status=draft&countryOfOrigin=IE',
        text: 'Next'
      }
    })
  })

  it('pluralises empty, single and range result labels', () => {
    const labels = {
      none: '0 results',
      single: '1 result',
      range: (start, end, total) => `${start}-${end}/${total} results`
    }
    expect(buildPageResultsRangeLabel({ totalElements: 0 }, 0, labels)).toBe(
      '0 results'
    )
    expect(buildPageResultsRangeLabel({ totalElements: 1 }, 1, labels)).toBe(
      '1 result'
    )
    expect(
      buildPageResultsRangeLabel(
        { page: 2, size: 25, totalElements: 27 },
        2,
        labels
      )
    ).toBe('26-27/27 results')
  })

  it('formats one GDS long date and degrades invalid values to blank', () => {
    expect(formatDisplayDate('2026-03-07')).toBe('7 March 2026')
    expect(formatDisplayDate('not-a-date')).toBe('')
    expect(formatDisplayDate()).toBe('')
  })

  it('parses complete range dates and leaves unset dates null', () => {
    expect(
      parseDateRangeQuery({
        'startDate-day': '7',
        'startDate-month': '3',
        'startDate-year': '2026'
      })
    ).toEqual({ start: '2026-03-07', end: null })
  })

  it.each([
    ['status', applyStatusFilter, 'status', 'draft'],
    ['country', applyCountryFilter, 'originCountryCode', 'IE']
  ])(
    'applies the %s filter and passes through when unset',
    (_name, apply, key, value) => {
      const rows = [{ [key]: value }, { [key]: 'other' }]
      expect(apply(rows, value)).toEqual([rows[0]])
      expect(apply(rows, 'missing')).toEqual([])
      expect(apply(rows, '')).toBe(rows)
    }
  )

  it('applies inclusive arrival range bounds and rejects missing arrivals', () => {
    const rows = [
      { arrivalDate: '2026-03-07' },
      { arrivalDate: '2026-03-08T12:00:00Z' },
      { arrivalDate: '2026-03-09' },
      { arrivalDate: null }
    ]
    expect(
      applyArrivalRangeFilter(rows, {
        start: '2026-03-07',
        end: '2026-03-09'
      })
    ).toEqual(rows.slice(0, 3))
    expect(applyArrivalRangeFilter(rows, {})).toBe(rows)
  })

  it('accepts valid filters', () => {
    expect(
      validateFilters(
        {
          referenceNumber: 'GBN-PP-26-ABC123',
          'startDate-day': '7',
          'startDate-month': '3',
          'startDate-year': '2026',
          'endDate-day': '8',
          'endDate-month': '3',
          'endDate-year': '2026'
        },
        messages
      )
    ).toBeNull()
  })

  it.each([
    [
      'long keywords',
      { referenceNumber: 'x'.repeat(256) },
      { referenceNumber: 'keywords max' }
    ],
    [
      'impossible start date',
      {
        'startDate-day': '31',
        'startDate-month': '2',
        'startDate-year': '2026'
      },
      { 'startDate-day': 'start real' }
    ],
    [
      'impossible end date',
      {
        'endDate-day': '31',
        'endDate-month': '2',
        'endDate-year': '2026'
      },
      { 'endDate-day': 'end real' }
    ],
    [
      'reversed range',
      {
        'startDate-day': '9',
        'startDate-month': '3',
        'startDate-year': '2026',
        'endDate-day': '8',
        'endDate-month': '3',
        'endDate-year': '2026'
      },
      { 'startDate-day': 'start before end' }
    ]
  ])('returns one canonical error for %s', (_name, query, expected) => {
    expect(validateFilters(query, messages)).toEqual(expected)
  })
})
