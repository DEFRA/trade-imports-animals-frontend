import { describe, expect, test, vi } from 'vitest'
import { cphNumberController } from './controller.js'
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

describe('cphNumberController', () => {
  describe('GET /cph-number', () => {
    test('renders view with cphNumber and referenceNumber from session', () => {
      const get = vi.fn((key) => {
        const values = { cphNumber: '123456789', referenceNumber: 'REF-123' }
        return values[key] ?? null
      })
      const request = { yar: { get } }
      const h = { view: vi.fn((template, data) => ({ template, data })) }

      const response = cphNumberController.get.handler(request, h)

      expect(h.view).toHaveBeenCalledWith('cph-number/index', {
        pageTitle: 'Add the County Parish Holding number (CPH)',
        heading: 'Add the County Parish Holding number (CPH)',
        cphNumber: '123456789',
        referenceNumber: 'REF-123'
      })
      expect(response.template).toBe('cph-number/index')
    })

    test('renders view with null values when session is empty', () => {
      const get = vi.fn(() => null)
      const request = { yar: { get } }
      const h = { view: vi.fn((template, data) => ({ template, data })) }

      cphNumberController.get.handler(request, h)

      expect(h.view).toHaveBeenCalledWith('cph-number/index', {
        pageTitle: 'Add the County Parish Holding number (CPH)',
        heading: 'Add the County Parish Holding number (CPH)',
        cphNumber: null,
        referenceNumber: null
      })
    })
  })

  describe('POST /cph-number', () => {
    test('saves cphNumber to session, submits notification, and redirects to /cph-number', async () => {
      vi.spyOn(notificationClient, 'submit').mockResolvedValue({})

      const set = vi.fn()
      const get = vi.fn(() => null)
      const request = {
        payload: { cphNumber: '123456789' },
        yar: { set, get }
      }
      const h = {
        view: vi.fn(),
        redirect: vi.fn((location) => ({ statusCode: 302, location }))
      }

      const response = await cphNumberController.post.handler(request, h)

      expect(set).toHaveBeenCalledWith('cphNumber', '123456789')
      expect(notificationClient.submit).toHaveBeenCalledWith(
        request,
        'trace-abc'
      )
      expect(response).toEqual({ statusCode: 302, location: '/cph-number' })
    })

    test('accepts a cphNumber starting with a leading zero', async () => {
      vi.spyOn(notificationClient, 'submit').mockResolvedValue({})

      const set = vi.fn()
      const get = vi.fn(() => null)
      const request = {
        payload: { cphNumber: '012345678' },
        yar: { set, get }
      }
      const h = {
        view: vi.fn(),
        redirect: vi.fn((location) => ({ statusCode: 302, location }))
      }

      await cphNumberController.post.handler(request, h)

      expect(set).toHaveBeenCalledWith('cphNumber', '012345678')
    })

    test('returns 400 with error list when cphNumber has fewer than 9 digits', async () => {
      const set = vi.fn()
      const get = vi.fn(() => null)
      const request = {
        payload: { cphNumber: '12345678' },
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

      const response = await cphNumberController.post.handler(request, h)

      expect(set).not.toHaveBeenCalled()
      expect(h.view).toHaveBeenCalledWith(
        'cph-number/index',
        expect.objectContaining({
          errorList: expect.arrayContaining([
            expect.objectContaining({
              text: 'CPH number must be exactly 9 digits',
              href: '#cphNumber'
            })
          ]),
          fieldErrors: expect.objectContaining({
            cphNumber: { text: 'CPH number must be exactly 9 digits' }
          })
        })
      )
      expect(response.template).toBe('cph-number/index')
      expect(response.statusCode).toBe(400)
    })

    test('returns 400 with error list when cphNumber contains non-digit characters', async () => {
      const set = vi.fn()
      const get = vi.fn(() => null)
      const request = {
        payload: { cphNumber: '12345678a' },
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

      const response = await cphNumberController.post.handler(request, h)

      expect(set).not.toHaveBeenCalled()
      expect(h.view).toHaveBeenCalledWith(
        'cph-number/index',
        expect.objectContaining({
          errorList: expect.arrayContaining([
            expect.objectContaining({
              text: 'CPH number must only contain numbers',
              href: '#cphNumber'
            })
          ])
        })
      )
      expect(response.statusCode).toBe(400)
    })

    test('shows error page when notification client throws', async () => {
      vi.spyOn(notificationClient, 'submit').mockRejectedValue(
        new Error('Backend error')
      )

      const set = vi.fn()
      const get = vi.fn(() => null)
      const request = {
        payload: { cphNumber: '123456789' },
        yar: { set, get }
      }
      const mockCode = vi.fn(() => ({ statusCode: 500 }))
      const h = {
        view: vi.fn(() => ({ code: mockCode })),
        redirect: vi.fn()
      }

      await cphNumberController.post.handler(request, h)

      expect(h.view).toHaveBeenCalledWith(
        'cph-number/index',
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
