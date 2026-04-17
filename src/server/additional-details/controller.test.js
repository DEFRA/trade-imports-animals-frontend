import { describe, expect, test, vi } from 'vitest'

import { additionalDetailsController } from './controller.js'

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

describe('additionalDetailsController', () => {
  describe('GET /additional-details', () => {
    test('renders view with session values and calls fetchNotification when referenceNumber exists', () => {
      fetchNotification.mockReturnValue('REF-123')

      const get = vi.fn((key) => {
        const values = {
          certifiedFor: 'approvedBodies',
          unweanedAnimals: 'yes'
        }
        return values[key] ?? null
      })

      const request = { yar: { get } }
      const h = {
        view: vi.fn((template, data) => ({ template, data }))
      }

      const response = additionalDetailsController.get.handler(request, h)

      expect(fetchNotification).toHaveBeenCalledWith(
        request,
        expect.any(Object)
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
      fetchNotification.mockReturnValue(null)

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

    test('does not call fetchNotification with a referenceNumber when no referenceNumber', () => {
      fetchNotification.mockReturnValue(null)

      const get = vi.fn(() => null)

      const request = { yar: { get } }
      const h = {
        view: vi.fn((template, data) => ({ template, data }))
      }

      additionalDetailsController.get.handler(request, h)

      expect(fetchNotification).toHaveBeenCalledWith(
        request,
        expect.any(Object)
      )
    })
  })

  describe('POST /additional-details', () => {
    test('stores certifiedFor and unweanedAnimals in session, submits notification, and redirects', async () => {
      submitNotification.mockResolvedValue(undefined)

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
      expect(submitNotification).toHaveBeenCalledWith(
        request,
        'trace-123',
        expect.any(Object)
      )
      expect(response).toEqual({
        statusCode: 302,
        location: '/accompanying-documents'
      })
    })

    test('redirects even when backend submit fails', async () => {
      submitNotification.mockResolvedValue(undefined)

      const set = vi.fn()
      const get = vi.fn(() => null)

      const request = {
        payload: {
          certifiedFor: 'slaughter',
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

      expect(response).toEqual({
        statusCode: 302,
        location: '/accompanying-documents'
      })
    })
  })
})
