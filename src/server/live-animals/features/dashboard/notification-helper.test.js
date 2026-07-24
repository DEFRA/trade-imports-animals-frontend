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

describe('promoted dashboard notification helpers', () => {
  it('Should validate the deployed sort vocabulary and default invalid values', () => {
    expect(parseNotificationSort('createdAt,asc')).toBe('createdAt,asc')
    expect(parseNotificationSort('reference,desc')).toBe('arrivalDate,desc')
  })

  it('Should normalize invalid pages and clamp pages against the response', () => {
    expect(normalizePageNumber(Number.NaN)).toBe(1)
    expect(normalizePageNumber(-1)).toBe(1)
    expect(normalizePageNumber(8, 3)).toBe(3)
    expect(normalizePageNumber(1, 0)).toBe(1)
  })

  it('Should build compact page and sort query strings', () => {
    expect(buildHomeListQueryString()).toBe('')
    expect(buildHomeListQueryString({ page: 2 })).toBe('?page=2')
    expect(buildHomeListQueryString({ page: 2, sort: 'createdAt,asc' })).toBe(
      '?page=2&sort=createdAt%2Casc'
    )
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
    expect(
      buildPaginationLinks(page, '/live-animals/home', 'createdAt,desc')
    ).toEqual({
      previous: {
        href: '/live-animals/home?sort=createdAt%2Cdesc',
        text: undefined
      },
      next: {
        href: '/live-animals/home?page=3&sort=createdAt%2Cdesc',
        text: undefined
      }
    })
  })
})
