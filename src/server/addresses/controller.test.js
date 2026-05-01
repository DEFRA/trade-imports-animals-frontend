import { describe, expect, test, vi } from 'vitest'

import { addressesController } from './controller.js'
import {
  fetchNotification,
  submitNotification
} from '../common/helpers/notification-helpers.js'

vi.mock('@defra/hapi-tracing', () => ({
  getTraceId: vi.fn(() => 'trace-123')
}))

vi.mock('../common/helpers/logging/logger.js', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn()
  })
}))

vi.mock('../common/helpers/notification-helpers.js', () => ({
  fetchNotification: vi.fn().mockResolvedValue({ referenceNumber: 'REF-123' }),
  submitNotification: vi.fn().mockResolvedValue(undefined)
}))

describe('addressesController', () => {
  describe('GET /addresses', () => {
    test('renders addresses page using fetchNotification for referenceNumber', async () => {
      fetchNotification.mockResolvedValue({ referenceNumber: 'REF-123' })

      const get = vi.fn((key) => {
        const values = { commodity: 'Fish' }
        return values[key] ?? null
      })
      const set = vi.fn()

      const request = { query: {}, yar: { get, set } }
      const h = {
        view: vi.fn((template, data) => ({ template, data }))
      }

      const response = await addressesController.get.handler(request, h)

      expect(fetchNotification).toHaveBeenCalledWith(
        request,
        expect.any(Object)
      )
      expect(h.view).toHaveBeenCalledWith('addresses/index', {
        pageTitle: 'Addresses',
        heading: 'Addresses',
        captionText: 'Notification details',
        referenceNumber: 'REF-123',
        selectedConsignor: null,
        selectedDestination: null
      })
      expect(response.template).toBe('addresses/index')
    })

    test('renders addresses page with referenceNumber null when fetchNotification returns null', async () => {
      fetchNotification.mockResolvedValue(null)

      const get = vi.fn((key) => {
        const values = { commodity: 'Fish' }
        return values[key] ?? null
      })
      const set = vi.fn()

      const request = { query: {}, yar: { get, set } }
      const h = {
        view: vi.fn((template, data) => ({ template, data }))
      }

      const response = await addressesController.get.handler(request, h)

      expect(h.view).toHaveBeenCalledWith('addresses/index', {
        pageTitle: 'Addresses',
        heading: 'Addresses',
        captionText: 'Notification details',
        referenceNumber: null,
        selectedConsignor: null,
        selectedDestination: null
      })
      expect(response.template).toBe('addresses/index')
    })

    test('saves selected consignor and destination from query into session', async () => {
      fetchNotification.mockResolvedValue({ referenceNumber: 'REF-123' })

      const selectedConsignor = {
        name: 'Astra Rosales',
        address: {
          addressLine1: '43 East Hague Extension',
          addressLine2: 'Delectus sitodio p. Laborum Odio tempor',
          addressLine3: 'Quasoccaecat ut ear, 30055',
          country: 'Switzerland'
        }
      }
      const selectedDestination = {
        name: 'Tech Imports Ltd',
        address: {
          addressLine1: '643 Main Street',
          addressLine2: 'Birmingham G1 3AZ',
          country: 'United Kingdom'
        }
      }
      const get = vi.fn((key) => {
        const values = {
          consignor: selectedConsignor,
          destination: selectedDestination
        }
        return values[key] ?? null
      })
      const set = vi.fn()

      const request = {
        query: { selectedConsignor: '0', selectedDestination: '0' },
        yar: { get, set }
      }
      const h = {
        view: vi.fn((template, data) => ({ template, data }))
      }

      await addressesController.get.handler(request, h)

      expect(set).toHaveBeenCalledWith('consignor', selectedConsignor)
      expect(set).toHaveBeenCalledWith('destination', selectedDestination)
      expect(h.view).toHaveBeenCalledWith(
        'addresses/index',
        expect.objectContaining({
          selectedConsignor,
          selectedDestination
        })
      )
    })
  })

  describe('POST /addresses', () => {
    test('submits notification and redirects to /cph-number', async () => {
      submitNotification.mockResolvedValue(undefined)

      const request = {}
      const redirect = vi.fn((location) => ({
        statusCode: 302,
        location
      }))
      const h = { redirect }

      const response = await addressesController.post.handler(request, h)

      expect(submitNotification).toHaveBeenCalledWith(
        request,
        expect.any(Object)
      )
      expect(h.redirect).toHaveBeenCalledWith('/cph-number')
      expect(response).toEqual({
        statusCode: 302,
        location: '/cph-number'
      })
    })

    test('still redirects to /cph-number when submitNotification throws', async () => {
      submitNotification.mockRejectedValue(new Error('Backend error'))

      const request = {}
      const redirect = vi.fn((location) => ({
        statusCode: 302,
        location
      }))
      const h = { redirect }

      const response = await addressesController.post.handler(request, h)

      expect(submitNotification).toHaveBeenCalledWith(
        request,
        expect.any(Object)
      )
      expect(h.redirect).toHaveBeenCalledWith('/cph-number')
      expect(response).toEqual({
        statusCode: 302,
        location: '/cph-number'
      })
    })
  })
})
