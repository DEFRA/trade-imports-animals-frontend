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
  fetchNotification: vi.fn().mockReturnValue('REF-123'),
  submitNotification: vi.fn().mockResolvedValue(undefined)
}))

describe('addressesController', () => {
  describe('GET /addresses', () => {
    test('renders addresses page using fetchNotification for referenceNumber', () => {
      fetchNotification.mockReturnValue('REF-123')

      const get = vi.fn((key) => {
        const values = { commodity: 'Fish' }
        return values[key] ?? null
      })

      const request = { yar: { get } }
      const h = {
        view: vi.fn((template, data) => ({ template, data }))
      }

      const response = addressesController.get.handler(request, h)

      expect(fetchNotification).toHaveBeenCalledWith(
        request,
        expect.any(Object)
      )
      expect(h.view).toHaveBeenCalledWith('addresses/index', {
        pageTitle: 'Addresses',
        heading: 'Addresses',
        referenceNumber: 'REF-123'
      })
      expect(response.template).toBe('addresses/index')
    })
  })

  describe('POST /addresses', () => {
    test('submits notification and redirects', async () => {
      submitNotification.mockResolvedValue(undefined)

      const get = vi.fn(() => null)
      const request = { yar: { get } }
      const h = {
        redirect: vi.fn((location) => ({ statusCode: 302, location }))
      }

      const response = await addressesController.post.handler(request, h)

      expect(submitNotification).toHaveBeenCalledWith(
        request,
        'trace-123',
        expect.any(Object)
      )
      expect(response).toEqual({ statusCode: 302, location: '/addresses' })
    })

    test('redirects even when backend submit fails', async () => {
      submitNotification.mockResolvedValue(undefined)

      const get = vi.fn(() => null)
      const request = { yar: { get } }
      const h = {
        redirect: vi.fn((location) => ({ statusCode: 302, location }))
      }

      const response = await addressesController.post.handler(request, h)

      expect(response).toEqual({ statusCode: 302, location: '/addresses' })
    })
  })
})
