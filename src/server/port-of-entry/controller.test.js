import { describe, expect, test, vi } from 'vitest'
import { portOfEntryController } from './controller.js'
import { notificationClient } from '../common/clients/notification-client.js'

vi.mock('@defra/hapi-tracing', () => ({
  getTraceId: vi.fn(() => 'trace-abc')
}))

vi.mock('../common/helpers/logging/logger.js', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn()
  })
}))

const validPayload = {
  portOfEntry: 'ABERDEEN',
  'arrivalDate-day': 27,
  'arrivalDate-month': 3,
  'arrivalDate-year': 2026
}

describe('portOfEntryController', () => {
  describe('GET /port-of-entry', () => {
    test('renders view with portOfEntry, arrivalDate and referenceNumber from session', () => {
      const get = vi.fn((key) => {
        const values = {
          portOfEntry: 'ABERDEEN',
          arrivalDate: { day: 27, month: 3, year: 2026 },
          referenceNumber: 'REF-123'
        }
        return values[key] ?? null
      })
      const request = { yar: { get } }
      const h = { view: vi.fn((template, data) => ({ template, data })) }

      const response = portOfEntryController.get.handler(request, h)

      expect(h.view).toHaveBeenCalledWith('port-of-entry/index', {
        pageTitle: 'Entry point and arrival at destination',
        portOfEntry: 'ABERDEEN',
        arrivalDate: { day: 27, month: 3, year: 2026 },
        referenceNumber: 'REF-123'
      })
      expect(response.template).toBe('port-of-entry/index')
    })

    test('renders view with null values when session is empty', () => {
      const get = vi.fn(() => null)
      const request = { yar: { get } }
      const h = { view: vi.fn((template, data) => ({ template, data })) }

      portOfEntryController.get.handler(request, h)

      expect(h.view).toHaveBeenCalledWith('port-of-entry/index', {
        pageTitle: 'Entry point and arrival at destination',
        portOfEntry: null,
        arrivalDate: null,
        referenceNumber: null
      })
    })
  })

  describe('POST /port-of-entry', () => {
    test('saves portOfEntry and arrivalDate to session, submits notification, and redirects', async () => {
      vi.spyOn(notificationClient, 'submit').mockResolvedValue({})

      const set = vi.fn()
      const get = vi.fn(() => null)
      const request = {
        payload: validPayload,
        yar: { set, get }
      }
      const h = {
        view: vi.fn(),
        redirect: vi.fn((location) => ({ statusCode: 302, location }))
      }

      const response = await portOfEntryController.post.handler(request, h)

      expect(set).toHaveBeenCalledWith('portOfEntry', 'ABERDEEN')
      expect(set).toHaveBeenCalledWith('arrivalDate', {
        day: 27,
        month: 3,
        year: 2026
      })
      expect(notificationClient.submit).toHaveBeenCalledWith(
        request,
        'trace-abc'
      )
      expect(response).toEqual({ statusCode: 302, location: '/port-of-entry' })
    })

    test('returns 400 with error list when arrival day is out of range', async () => {
      const set = vi.fn()
      const get = vi.fn(() => null)
      const request = {
        payload: { ...validPayload, 'arrivalDate-day': 32 },
        yar: { set, get }
      }
      const h = {
        view: vi.fn((template, data) => ({
          template,
          data,
          code: vi.fn(function (statusCode) {
            return { ...this, statusCode }
          })
        })),
        redirect: vi.fn()
      }

      const response = await portOfEntryController.post.handler(request, h)

      expect(set).not.toHaveBeenCalled()
      expect(h.view).toHaveBeenCalledWith(
        'port-of-entry/index',
        expect.objectContaining({
          errorList: expect.arrayContaining([
            expect.objectContaining({ text: 'Enter a valid day' })
          ])
        })
      )
      expect(response.statusCode).toBe(400)
    })

    test('shows error when notification client throws', async () => {
      vi.spyOn(notificationClient, 'submit').mockRejectedValue(
        new Error('Backend error')
      )

      const set = vi.fn()
      const get = vi.fn(() => null)
      const request = {
        payload: validPayload,
        yar: { set, get }
      }
      const mockCode = vi.fn(() => ({ statusCode: 500 }))
      const h = {
        view: vi.fn(() => ({ code: mockCode })),
        redirect: vi.fn()
      }

      await portOfEntryController.post.handler(request, h)

      expect(h.view).toHaveBeenCalledWith(
        'port-of-entry/index',
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
