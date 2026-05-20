import { describe, expect, test, vi } from 'vitest'

import { additionalDetailsController } from './controller.js'
import { sessionKeys } from '../common/constants/session-keys.js'
import { SUBMISSION_FAILURE_MESSAGE } from '../common/constants/messages.js'
import {
  saveNotification,
  fetchNotification
} from '../common/helpers/notification-helpers.js'

vi.mock('../common/helpers/notification-helpers.js')

vi.mock('../common/helpers/logging/logger.js', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn()
  })
}))

describe('additionalDetailsController', () => {
  describe('GET /additional-details', () => {
    test('renders view with session values and calls fetchNotification when referenceNumber exists', async () => {
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

      const response = await additionalDetailsController.get.handler(request, h)

      expect(fetchNotification).toHaveBeenCalledWith(
        request,
        expect.objectContaining({
          info: expect.any(Function),
          error: expect.any(Function)
        })
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

    test('defaults unweanedAnimals to "no" when not set in session', async () => {
      const get = vi.fn(() => null)

      const request = { yar: { get } }
      const h = {
        view: vi.fn((template, data) => ({ template, data }))
      }

      await additionalDetailsController.get.handler(request, h)

      expect(h.view).toHaveBeenCalledWith(
        'additional-details/index',
        expect.objectContaining({
          certifiedFor: null,
          unweanedAnimals: 'no'
        })
      )
    })

    test('calls fetchNotification even when no referenceNumber (helper handles guard)', async () => {
      const get = vi.fn(() => null)

      const request = { yar: { get } }
      const h = {
        view: vi.fn((template, data) => ({ template, data }))
      }

      await additionalDetailsController.get.handler(request, h)

      expect(fetchNotification).toHaveBeenCalledWith(
        request,
        expect.objectContaining({
          info: expect.any(Function),
          error: expect.any(Function)
        })
      )
    })
  })

  describe('POST /additional-details', () => {
    test('stores certifiedFor and unweanedAnimals in session, submits notification, and redirects', async () => {
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
        sessionKeys.certifiedFor,
        'breedingAndOrProduction'
      )
      expect(set).toHaveBeenCalledWith(sessionKeys.unweanedAnimals, 'no')
      expect(saveNotification).toHaveBeenCalledWith(
        request,
        expect.objectContaining({
          info: expect.any(Function),
          error: expect.any(Function)
        })
      )
      expect(response).toEqual({
        statusCode: 302,
        location: '/accompanying-documents'
      })
    })

    test('shows error page when backend submit fails', async () => {
      saveNotification.mockRejectedValueOnce(
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
          errorList: [{ text: SUBMISSION_FAILURE_MESSAGE }]
        })
      )
      expect(mockCode).toHaveBeenCalledWith(500)
      expect(h.redirect).not.toHaveBeenCalled()
    })
  })
})
