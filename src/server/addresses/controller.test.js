import { describe, expect, test, vi } from 'vitest'

import { addressesController } from './controller.js'
import { notificationClient } from '../common/clients/notification-client.js'

vi.mock('@defra/hapi-tracing', () => ({
  getTraceId: vi.fn(() => 'trace-123')
}))

vi.mock('../common/helpers/logging/logger.js', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn()
  })
}))

describe('addressesController', () => {
  describe('GET /addresses', () => {
    test('renders addresses page using session referenceNumber', () => {
      const get = vi.fn((key) => {
        const values = {
          commodity: 'Fish',
          referenceNumber: 'REF-123'
        }
        return values[key] ?? null
      })

      const request = { yar: { get } }
      const h = {
        view: vi.fn((template, data) => ({ template, data }))
      }

      const response = addressesController.get.handler(request, h)

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
      vi.spyOn(notificationClient, 'submit').mockResolvedValue({
        referenceNumber: 'REF-123'
      })

      const get = vi.fn((key) => {
        const values = {
          referenceNumber: 'REF-123'
        }
        return values[key] ?? null
      })

      const request = {
        yar: { get }
      }

      const h = {
        redirect: vi.fn((location, opts) => ({
          statusCode: 302,
          location,
          opts
        }))
      }

      const response = await addressesController.post.handler(request, h)

      expect(notificationClient.submit).toHaveBeenCalledWith(
        request,
        'trace-123'
      )
      expect(h.redirect).toHaveBeenCalledWith('/cph-number')
      expect(response).toEqual({
        statusCode: 302,
        location: '/cph-number',
        opts: undefined
      })
    })

    test('shows error page when notification client throws', async () => {
      vi.spyOn(notificationClient, 'submit').mockRejectedValue(
        new Error('Backend error')
      )

      const get = vi.fn((key) => {
        const values = { referenceNumber: 'REF-123' }
        return values[key] ?? null
      })

      const request = { yar: { get } }
      const mockCode = vi.fn(() => ({ statusCode: 500 }))
      const h = {
        view: vi.fn(() => ({ code: mockCode })),
        redirect: vi.fn()
      }

      await addressesController.post.handler(request, h)

      expect(h.view).toHaveBeenCalledWith(
        'addresses/index',
        expect.objectContaining({
          errorList: [
            { text: 'Something went wrong, please contact the EUDP team' }
          ]
        })
      )
      expect(mockCode).toHaveBeenCalledWith(500)
      expect(h.redirect).not.toHaveBeenCalled()
    })

    test('still submits and redirects when addresses are not in session', async () => {
      vi.spyOn(notificationClient, 'submit').mockResolvedValue({
        referenceNumber: 'REF-123'
      })

      const get = vi.fn((key) => {
        const values = {
          referenceNumber: 'REF-123'
        }
        return values[key] ?? null
      })

      const request = {
        yar: { get }
      }

      const h = {
        redirect: vi.fn((location, opts) => ({
          statusCode: 302,
          location,
          opts
        }))
      }

      const response = await addressesController.post.handler(request, h)
      expect(notificationClient.submit).toHaveBeenCalledWith(
        request,
        'trace-123'
      )
      expect(response).toEqual({
        statusCode: 302,
        location: '/cph-number',
        opts: undefined
      })
    })
  })
})
