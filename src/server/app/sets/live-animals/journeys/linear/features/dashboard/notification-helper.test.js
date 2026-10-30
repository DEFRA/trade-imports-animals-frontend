import { describe, expect, it } from 'vitest'
import { runInZone } from '../../../../../../../common/test-helpers/run-in-zone.js'
import {
  buildHomeListQueryString,
  buildPageResultsRangeLabel,
  buildPaginationLinks,
  formatCommodity,
  formatDisplayCalendarDate,
  formatDisplayMoment,
  normalizePageNumber,
  parseNotificationSort
} from './notification-helper.js'

const CREATED_AT_ASCENDING_SORT = 'createdAt,asc'

const ZONE_WEST_OF_UTC_GUARDING_MOMENTS = 'America/New_York'

const ZONE_EAST_OF_UTC_GUARDING_DATE_ONLY_VALUES = 'Europe/London'

const ARRIVAL_DATE = '2026-07-21'

const ARRIVAL_DAY = '21 Jul 2026'

describe('promoted dashboard notification helpers', () => {
  it('Should validate the deployed sort vocabulary and default invalid values', () => {
    expect(parseNotificationSort(CREATED_AT_ASCENDING_SORT)).toBe(
      CREATED_AT_ASCENDING_SORT
    )
    expect(parseNotificationSort('reference,desc')).toBe('arrivalDate,desc')
  })

  it('Should normalize invalid pages and clamp pages against the response', () => {
    expect(normalizePageNumber(Number.NaN)).toBe(1)
    expect(normalizePageNumber(-1)).toBe(1)
    expect(normalizePageNumber(8, 3)).toBe(3)
    expect(normalizePageNumber(1, 0)).toBe(1)
  })

  it('Should build compact page, sort and reference query strings', () => {
    expect(buildHomeListQueryString()).toBe('')
    expect(buildHomeListQueryString({ page: 2 })).toBe('?page=2')
    expect(
      buildHomeListQueryString({ page: 2, sort: CREATED_AT_ASCENDING_SORT })
    ).toBe('?page=2&sort=createdAt%2Casc')
    expect(
      buildHomeListQueryString({
        page: 2,
        sort: CREATED_AT_ASCENDING_SORT,
        referenceNumber: 'GBN-AG-26-ABC123'
      })
    ).toBe('?page=2&sort=createdAt%2Casc&referenceNumber=GBN-AG-26-ABC123')
  })

  it('Should format dashboard dates and commodity objects', () => {
    expect(formatDisplayCalendarDate('2026-03-05')).toBe('5 Mar 2026')
    expect(formatDisplayCalendarDate('not-a-date')).toBe('')
    expect(formatDisplayCalendarDate(null)).toBe('')
    expect(formatDisplayMoment('not-a-date')).toBe('')
    expect(formatDisplayMoment(null)).toBe('')
    expect(formatCommodity({ commodityCode: '0102' })).toBe('0102')
    expect(formatCommodity({ name: 'Cow' })).toBe('Cow')
    expect(formatCommodity(null)).toBe('')
  })

  it('Should render an arrival date as the day the user chose', () => {
    expect(formatDisplayCalendarDate(ARRIVAL_DATE)).toBe(ARRIVAL_DAY)
  })

  it('Should render a moment as the UK day it happened', () => {
    expect(formatDisplayMoment('2026-09-10T23:35:39.455Z')).toBe('11 Sep 2026')
  })

  it('Should render a moment and an arrival date the same when the process runs west of UTC', () => {
    runInZone(ZONE_WEST_OF_UTC_GUARDING_MOMENTS, () => {
      expect(formatDisplayCalendarDate(ARRIVAL_DATE)).toBe(ARRIVAL_DAY)
      expect(formatDisplayMoment('2026-09-10T23:35:39.455Z')).toBe(
        '11 Sep 2026'
      )
    })
  })

  it('Should render a date-only arrival date the same when the process runs east of UTC', () => {
    runInZone(ZONE_EAST_OF_UTC_GUARDING_DATE_ONLY_VALUES, () => {
      expect(formatDisplayCalendarDate(ARRIVAL_DATE)).toBe(ARRIVAL_DAY)
      expect(formatDisplayCalendarDate('2026-07-21T00:00:00')).toBe(ARRIVAL_DAY)
    })
  })

  it('Should build deployed-style result ranges and govuk pagination links', () => {
    const page = {
      page: 2,
      size: 20,
      totalElements: 45,
      totalPages: 3
    }

    expect(buildPageResultsRangeLabel(page, 20)).toBe(
      'Showing 21 to 40 of 45 Results'
    )
    expect(buildPaginationLinks(page, '/', 'createdAt,desc')).toEqual({
      previous: {
        href: '/?sort=createdAt%2Cdesc'
      },
      next: {
        href: '/?page=3&sort=createdAt%2Cdesc'
      }
    })
    expect(
      buildPaginationLinks(page, '/', 'createdAt,desc', {}, 'GBN-AG-26-ABC123')
        .next.href
    ).toBe('/?page=3&sort=createdAt%2Cdesc&referenceNumber=GBN-AG-26-ABC123')
  })
})
