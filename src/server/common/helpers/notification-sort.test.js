import { describe, expect, test } from 'vitest'
import { parseSort, toBackendSortParams } from './notification-sort.js'
import {
  DEFAULT_SORT,
  NOTIFICATION_SORT_VALUES
} from '../constants/notification-sort.js'

describe('parseSort', () => {
  test('returns default for undefined', () => {
    expect(parseSort(undefined)).toBe(DEFAULT_SORT)
  })

  test('returns default for empty string', () => {
    expect(parseSort('')).toBe(DEFAULT_SORT)
  })

  test('returns default for unknown value', () => {
    expect(parseSort('not-a-sort')).toBe(DEFAULT_SORT)
  })

  test('returns default for prototype-pollution attempt', () => {
    expect(parseSort('__proto__')).toBe(DEFAULT_SORT)
    expect(parseSort('constructor')).toBe(DEFAULT_SORT)
  })

  test.each(Object.values(NOTIFICATION_SORT_VALUES))(
    'returns %s verbatim',
    (value) => {
      expect(parseSort(value)).toBe(value)
    }
  )
})

describe('toBackendSortParams', () => {
  test('maps arrival-desc to transport.arrivalDate desc', () => {
    expect(toBackendSortParams(NOTIFICATION_SORT_VALUES.arrivalDesc)).toEqual({
      sort: 'transport.arrivalDate',
      direction: 'desc'
    })
  })

  test('maps arrival-asc to transport.arrivalDate asc', () => {
    expect(toBackendSortParams(NOTIFICATION_SORT_VALUES.arrivalAsc)).toEqual({
      sort: 'transport.arrivalDate',
      direction: 'asc'
    })
  })

  test('maps created-desc to created desc', () => {
    expect(toBackendSortParams(NOTIFICATION_SORT_VALUES.createdDesc)).toEqual({
      sort: 'created',
      direction: 'desc'
    })
  })

  test('maps created-asc to created asc', () => {
    expect(toBackendSortParams(NOTIFICATION_SORT_VALUES.createdAsc)).toEqual({
      sort: 'created',
      direction: 'asc'
    })
  })
})
