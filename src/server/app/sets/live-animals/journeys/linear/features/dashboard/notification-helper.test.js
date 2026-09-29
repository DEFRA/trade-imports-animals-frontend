import { describe, expect, it } from 'vitest'
import {
  buildHomeListQueryString,
  buildPageResultsRangeLabel,
  buildPaginationLinks,
  formatCommodity,
  formatDisplayDate,
  normalizePageNumber,
  parseNotificationSort
} from './notification-helper.js'

const CREATED_AT_ASCENDING_SORT = 'createdAt,asc'

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
    expect(formatDisplayDate('2026-03-05')).toBe('5 Mar 2026')
    expect(formatDisplayDate('not-a-date')).toBe('')
    expect(formatDisplayDate(null)).toBe('')
    expect(formatCommodity({ name: 'Cow' })).toBe('Cow')
    expect(
      formatCommodity({ commodityCode: '0101' }, (code) =>
        code === '0101' ? 'Horse' : undefined
      )
    ).toBe('Horse')
    expect(formatCommodity(null)).toBe('')
  })

  it('Should render each kind of wire date in the service zone', () => {
    // Both kinds now arrive as instants. A calendar date is midnight UTC and
    // must show as the day the user typed; a moment must show as the UK day it
    // happened, which is the next day for anything after 23:00 UTC in BST.
    expect(formatDisplayDate('2026-07-21T00:00:00.000Z')).toBe('21 Jul 2026')
    expect(formatDisplayDate('2026-09-10T23:35:39.455Z')).toBe('11 Sep 2026')
  })

  it('Should render the same date whatever zone the process runs in', () => {
    // The suite pins TZ=UTC, the one setting where an ambient-zone formatter
    // and a service-zone one agree — so the zone has to be moved for this to
    // mean anything. America/New_York is west of UTC on purpose: that is where
    // a UTC-midnight date renders a day early. See calendar.test.js.
    const original = process.env.TZ
    process.env.TZ = 'America/New_York'
    try {
      expect(new Date('2026-07-21T00:00:00Z').getTimezoneOffset()).toBe(240)
      expect(formatDisplayDate('2026-07-21T00:00:00.000Z')).toBe('21 Jul 2026')
      expect(formatDisplayDate('2026-09-10T23:35:39.455Z')).toBe('11 Sep 2026')
    } finally {
      process.env.TZ = original
    }
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
