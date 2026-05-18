import { describe, expect, test } from 'vitest'

import {
  mapNotificationToListView,
  mapNotificationsToList,
  normalizeNotificationsResponse
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
      const origin = { countryName: 'Finland' }

      const viewItem = mapNotificationToListView({
        referenceNumber: 'REF-123',
        status: 'DRAFT',
        createdAt: '2026-04-20T10:00:00.000Z',
        origin,
        commodity: { name: 'Cow', code: '0102' },
        consignor,
        transport: { arrivalDate: '2026-04-20' }
      })

      expect(viewItem).toEqual({
        referenceNumber: 'REF-123',
        commodity: { name: 'Cow', code: '0102' },
        origin,
        arrivalAtDestination: '20 Apr 2026',
        consignor,
        status: 'DRAFT',
        dateCreated: '20 Apr 2026'
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
      const viewItems = mapNotificationsToList({
        notifications: [
          {
            referenceNumber: 'REF-1',
            commodity: { name: 'Fish' },
            origin: { countryCode: 'GB' }
          }
        ]
      })

      expect(viewItems).toHaveLength(1)
      expect(viewItems[0].referenceNumber).toBe('REF-1')
      expect(viewItems[0].commodity).toEqual({ name: 'Fish' })
      expect(viewItems[0].origin).toEqual({ countryCode: 'GB' })
    })

    test('Should return empty array when response has no notifications', () => {
      expect(mapNotificationsToList({})).toEqual([])
    })
  })
})
