import { describe, expect, test } from 'vitest'

import {
  mapNotificationToListView,
  mapNotificationsToList,
  normalizeNotificationsResponse,
  mapPaginatedResponse,
  buildPaginationLinks,
  buildPageResultsRangeLabel,
  buildHomeListQueryString,
  parseNotificationSort,
  DEFAULT_NOTIFICATION_SORT
} from './notification-helper.js'

describe('#notificationListView', () => {
  describe('normalizeNotificationsResponse', () => {
    test('Should return array when response is already an array', () => {
      const notifications = [{ referenceNumber: 'REF-1' }]

      expect(normalizeNotificationsResponse(notifications)).toEqual(
        notifications
      )
    })

    test('Should unwrap notifications property', () => {
      const notifications = [{ referenceNumber: 'REF-1' }]

      expect(normalizeNotificationsResponse({ notifications })).toEqual(
        notifications
      )
    })

    test('Should unwrap content property', () => {
      const notifications = [{ referenceNumber: 'REF-1' }]

      expect(
        normalizeNotificationsResponse({ content: notifications })
      ).toEqual(notifications)
    })

    test('Should return empty array for unknown shape', () => {
      expect(normalizeNotificationsResponse({})).toEqual([])
    })
  })

  describe('mapNotificationToListViewItem', () => {
    test('Should map notification fields for the home list', () => {
      const consignor = { name: 'Tampere Horse Transport' }
      const origin = { countryCode: 'FI' }

      const viewItem = mapNotificationToListView(
        {
          referenceNumber: 'REF-123',
          status: 'DRAFT',
          createdAt: '2026-04-20T10:00:00.000Z',
          origin,
          commodity: { name: 'Cow', code: '0102' },
          consignor,
          transport: { arrivalDate: '2026-04-20' }
        },
        { FI: 'Finland' }
      )

      expect(viewItem).toEqual({
        referenceNumber: 'REF-123',
        commodity: { name: 'Cow', code: '0102' },
        origin: { countryCode: 'FI', countryName: 'Finland' },
        arrivalAtDestination: '20 Apr 2026',
        consignor,
        status: 'DRAFT',
        dateCreated: '20 Apr 2026'
      })
    })

    test('Should set countryName to undefined when code is not in countryMap', () => {
      const viewItem = mapNotificationToListView(
        { origin: { countryCode: 'ZZ' } },
        { FI: 'Finland' }
      )

      expect(viewItem.origin).toEqual({
        countryCode: 'ZZ',
        countryName: undefined
      })
    })

    test('Should annotate origin with countryName when countryMap is empty', () => {
      const viewItem = mapNotificationToListView({
        origin: { countryCode: 'FI' }
      })

      expect(viewItem.origin).toEqual({
        countryCode: 'FI',
        countryName: undefined
      })
    })

    test('Should default status to DRAFT when omitted', () => {
      const viewItem = mapNotificationToListView({
        referenceNumber: 'REF-456'
      })

      expect(viewItem.status).toBe('DRAFT')
      expect(viewItem.referenceNumber).toBe('REF-456')
    })

    test('Should use empty strings for missing optional fields', () => {
      const viewItem = mapNotificationToListView({})

      expect(viewItem).toEqual({
        referenceNumber: '',
        commodity: '',
        origin: null,
        arrivalAtDestination: '',
        consignor: null,
        status: 'DRAFT',
        dateCreated: ''
      })
    })

    test('Should format commodity as a string when provided as a string', () => {
      const viewItem = mapNotificationToListView({
        commodity: 'Fish'
      })

      expect(viewItem.commodity).toBe('Fish')
    })

    test('Should pass through commodity object when code is missing', () => {
      const commodity = { name: 'Fish' }
      const viewItem = mapNotificationToListView({ commodity })

      expect(viewItem.commodity).toEqual(commodity)
    })

    test('Should read arrival date from transport.arrivalDate', () => {
      const viewItem = mapNotificationToListView({
        transport: { arrivalDate: '2026-03-05' }
      })

      expect(viewItem.arrivalAtDestination).toBe('5 Mar 2026')
    })

    test('Should read arrival date from root arrivalDate when transport is absent', () => {
      const viewItem = mapNotificationToListView({
        arrivalDate: '2026-01-15'
      })

      expect(viewItem.arrivalAtDestination).toBe('15 Jan 2026')
    })

    test('Should format dateCreated from createdAt', () => {
      const viewItem = mapNotificationToListView({
        createdAt: '2026-04-20T10:00:00.000Z'
      })

      expect(viewItem.dateCreated).toBe('20 Apr 2026')
    })
  })

  describe('mapNotificationsToListView', () => {
    test('Should map each notification in the response', () => {
      const viewItems = mapNotificationsToList(
        {
          notifications: [
            {
              referenceNumber: 'REF-1',
              commodity: { name: 'Fish' },
              origin: { countryCode: 'GB' }
            }
          ]
        },
        { GB: 'United Kingdom' }
      )

      expect(viewItems).toHaveLength(1)
      expect(viewItems[0].referenceNumber).toBe('REF-1')
      expect(viewItems[0].commodity).toEqual({ name: 'Fish' })
      expect(viewItems[0].origin).toEqual({
        countryCode: 'GB',
        countryName: 'United Kingdom'
      })
    })

    test('Should return empty array when response has no notifications', () => {
      expect(mapNotificationsToList({})).toEqual([])
    })
  })

  describe('mapPaginatedResponse', () => {
    test('Should map notifications and pagination metadata from NotificationPageResponse', () => {
      const response = {
        content: [
          { referenceNumber: 'REF-1', status: 'DRAFT' },
          { referenceNumber: 'REF-2', status: 'SUBMITTED' }
        ],
        page: 1,
        size: 20,
        totalElements: 42,
        totalPages: 3
      }

      const result = mapPaginatedResponse(response)

      expect(result.notifications).toHaveLength(2)
      expect(result.notifications[0].referenceNumber).toBe('REF-1')
      expect(result.pagination).toEqual({
        page: 1,
        size: 20,
        totalElements: 42,
        totalPages: 3
      })
    })

    test('Should default page counters and set size undefined when missing', () => {
      const result = mapPaginatedResponse({ content: [] })

      expect(result.notifications).toEqual([])
      expect(result.pagination).toEqual({
        page: 1,
        size: undefined,
        totalElements: 0,
        totalPages: 1
      })
    })

    test('Should default to last page page when manually set page to a large or invalid number', () => {
      const result = mapPaginatedResponse({
        content: [],
        page: 99,
        totalPages: 3
      })

      expect(result.pagination.page).toBe(3)
      expect(result.pagination.totalPages).toBe(3)
    })
  })

  describe('buildCustomPagination', () => {
    test('Should return null when there is only one page', () => {
      expect(
        buildPaginationLinks({
          page: 1,
          totalPages: 1
        })
      ).toBeNull()
    })

    test('Should build previous and next links for a middle page', () => {
      const result = buildPaginationLinks({
        page: 2,
        totalPages: 3
      })

      expect(result.previous).toEqual({
        href: '/',
        label: 'Previous page',
        pageText: '1 of 3'
      })
      expect(result.next).toEqual({
        href: '/?page=3',
        label: 'Next page',
        pageText: '3 of 3'
      })
    })

    test('Should hide previous link on the first page', () => {
      const result = buildPaginationLinks({
        page: 1,
        totalPages: 3
      })

      expect(result.previous).toBeUndefined()
      expect(result.next.pageText).toBe('2 of 3')
    })

    test('Should hide next link on the last page', () => {
      const result = buildPaginationLinks({
        page: 3,
        totalPages: 3
      })

      expect(result.next).toBeUndefined()
      expect(result.previous.pageText).toBe('2 of 3')
    })

    test('Should default page before building links when page is too large', () => {
      const result = buildPaginationLinks({
        page: 99,
        totalPages: 3
      })

      expect(result.next).toBeUndefined()
      expect(result.previous.pageText).toBe('2 of 3')
    })

    test('Should include sort in pagination links when not the default', () => {
      const result = buildPaginationLinks(
        { page: 2, totalPages: 3 },
        '/',
        'createdAt,desc'
      )

      expect(result.previous.href).toBe('/?sort=createdAt%2Cdesc')
      expect(result.next.href).toBe('/?page=3&sort=createdAt%2Cdesc')
    })
  })

  describe('parseNotificationSort', () => {
    test('Should return default sort when query is missing or invalid', () => {
      expect(parseNotificationSort()).toBe(DEFAULT_NOTIFICATION_SORT)
      expect(parseNotificationSort('invalid')).toBe(DEFAULT_NOTIFICATION_SORT)
    })

    test('Should return requested sort when valid', () => {
      expect(parseNotificationSort('createdAt,asc')).toBe('createdAt,asc')
    })
  })

  describe('buildHomeListQueryString', () => {
    test('Should omit query string when on first page with default sort', () => {
      expect(buildHomeListQueryString()).toBe('')
    })

    test('Should include page and sort when provided', () => {
      expect(
        buildHomeListQueryString({ page: 2, sort: 'createdAt,desc' })
      ).toBe('?page=2&sort=createdAt%2Cdesc')
    })
  })

  describe('buildResultsRangeLabel', () => {
    test('Should return No results when total is zero', () => {
      expect(
        buildPageResultsRangeLabel(
          { page: 1, size: 20, totalElements: 0, totalPages: 1 },
          0
        )
      ).toBe('No Results')
    })

    test('Should return singular label for one result', () => {
      expect(
        buildPageResultsRangeLabel(
          { page: 1, size: 20, totalElements: 1, totalPages: 1 },
          1
        )
      ).toBe('Showing 1 Results')
    })

    test('Should return range for first page', () => {
      expect(
        buildPageResultsRangeLabel(
          { page: 1, size: 20, totalElements: 57, totalPages: 3 },
          20
        )
      ).toBe('Showing 1 to 20 of 57 Results')
    })

    test('Should return range for middle page', () => {
      expect(
        buildPageResultsRangeLabel(
          { page: 2, size: 20, totalElements: 57, totalPages: 3 },
          20
        )
      ).toBe('Showing 21 to 40 of 57 Results')
    })

    test('Should return range for last partial page', () => {
      expect(
        buildPageResultsRangeLabel(
          { page: 3, size: 20, totalElements: 57, totalPages: 3 },
          17
        )
      ).toBe('Showing 41 to 57 of 57 Results')
    })

    test('Should return single-position label when only one item on page', () => {
      expect(
        buildPageResultsRangeLabel(
          { page: 2, size: 20, totalElements: 57, totalPages: 3 },
          1
        )
      ).toBe('Showing 21 of 57 Results')
    })
  })
})
