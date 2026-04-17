import { describe, expect, test, vi } from 'vitest'

import { additionalDetailsController } from './controller.js'
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

describe('additionalDetailsController', () => {
  describe('GET /additional-details', () => {
    test('renders view with session values and calls notificationClient.get when referenceNumber exists', () => {
      vi.spyOn(notificationClient, 'get').mockResolvedValue(null)

      const get = vi.fn((key) => {
        const values = {
          certifiedFor: 'approvedBodies',
          unweanedAnimals: 'yes',
          referenceNumber: 'REF-123'
        }
        return values[key] ?? null
      })

      const request = { yar: { get } }
      const h = {
        view: vi.fn((template, data) => ({ template, data }))
      }

      const response = additionalDetailsController.get.handler(request, h)

      expect(notificationClient.get).toHaveBeenCalledWith(
        request,
        'REF-123',
        'trace-123'
      )

      expect(h.view).toHaveBeenCalledWith('additional-details/index', {
        pageTitle: 'Additional animal details',
        heading: 'Additional animal details',
        certifiedFor: 'approvedBodies',
        unweanedAnimals: 'yes',
        referenceNumber: 'REF-123'
      })

      expect(response.template).toBe('additional-details/index')
    })

    test('defaults unweanedAnimals to "no" when not set in session', () => {
      const get = vi.fn(() => null)

      const request = { yar: { get } }
      const h = {
        view: vi.fn((template, data) => ({ template, data }))
      }

      additionalDetailsController.get.handler(request, h)

      expect(h.view).toHaveBeenCalledWith(
        'additional-details/index',
        expect.objectContaining({
          certifiedFor: null,
          unweanedAnimals: 'no'
        })
      )
    })

    test('does not call notificationClient.get when no referenceNumber', () => {
      const getSpy = vi.spyOn(notificationClient, 'get').mockResolvedValue(null)

      const get = vi.fn(() => null)

      const request = { yar: { get } }
      const h = {
        view: vi.fn((template, data) => ({ template, data }))
      }

      additionalDetailsController.get.handler(request, h)

      expect(getSpy).not.toHaveBeenCalled()
    })
  })

  describe('POST /additional-details', () => {
    test('stores certifiedFor and unweanedAnimals in session, submits notification, and redirects', async () => {
      vi.spyOn(notificationClient, 'submit').mockResolvedValue({
        referenceNumber: 'REF-123'
      })

      const set = vi.fn()
      const get = vi.fn((key) => (key === 'referenceNumber' ? 'REF-123' : null))

      const request = {
        payload: {
          certifiedFor: 'breedingAndOrProduction',
          unweanedAnimals: 'no'
        },
        yar: { set, get }
      }

      const h = {
        redirect: vi.fn((location) => ({ statusCode: 302, location }))
      }

      const response = await additionalDetailsController.post.handler(
        request,
        h
      )

      expect(set).toHaveBeenCalledWith(
        'certifiedFor',
        'breedingAndOrProduction'
      )
      expect(set).toHaveBeenCalledWith('unweanedAnimals', 'no')
      expect(notificationClient.submit).toHaveBeenCalledWith(
        request,
        'trace-123'
      )
      expect(response).toEqual({
        statusCode: 302,
        location: '/cph-number'
      })
    })

    test('shows error page when backend submit fails', async () => {
      vi.spyOn(notificationClient, 'submit').mockRejectedValue(
        Object.assign(new Error('Backend error'), {
          status: 500,
          statusText: 'Internal Server Error'
        })
      )

      const set = vi.fn()
      const get = vi.fn(() => null)

      const request = {
        payload: {
          certifiedFor: 'slaughter',
          unweanedAnimals: 'no'
        },
        yar: { set, get }
      }

      const mockCode = vi.fn(() => ({ statusCode: 500 }))
      const h = {
        view: vi.fn(() => ({ code: mockCode })),
        redirect: vi.fn()
      }

      await additionalDetailsController.post.handler(request, h)

      expect(h.view).toHaveBeenCalledWith(
        'additional-details/index',
        expect.objectContaining({
          errorList: [
            { text: 'Something went wrong, please contact the EUDP team' }
          ]
        })
      )
      expect(mockCode).toHaveBeenCalledWith(500)
      expect(h.redirect).not.toHaveBeenCalled()
    })
  })
})
