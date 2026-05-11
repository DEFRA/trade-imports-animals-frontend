import { describe, expect, test, vi } from 'vitest'
import { declarationController } from './controller.js'
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

describe('declarationController', () => {
  describe('GET /declaration', () => {
    test('renders view with referenceNumber and submissionDate from session', () => {
      const get = vi.fn((key) => {
        if (key === 'referenceNumber') return 'DRAFT.IMP.2026.abc123'
        return null
      })
      const request = { yar: { get } }
      const h = { view: vi.fn((template, data) => ({ template, data })) }

      const response = declarationController.get.handler(request, h)

      expect(h.view).toHaveBeenCalledWith(
        'declaration/index',
        expect.objectContaining({
          pageTitle: 'Declaration',
          referenceNumber: 'DRAFT.IMP.2026.abc123',
          submissionDate: expect.any(String)
        })
      )
      expect(response.template).toBe('declaration/index')
    })

    test('renders view with null referenceNumber when session is empty', () => {
      const get = vi.fn(() => null)
      const request = { yar: { get } }
      const h = { view: vi.fn((template, data) => ({ template, data })) }

      declarationController.get.handler(request, h)

      expect(h.view).toHaveBeenCalledWith(
        'declaration/index',
        expect.objectContaining({
          referenceNumber: null
        })
      )
    })
  })

  describe('POST /declaration', () => {
    test('submits notification and redirects to /declaration on success', async () => {
      vi.spyOn(notificationClient, 'submitNotification').mockResolvedValue({})

      const get = vi.fn((key) => {
        if (key === 'referenceNumber') return 'DRAFT.IMP.2026.abc123'
        return null
      })
      const request = {
        payload: { declaration: 'confirmed' },
        yar: { get }
      }
      const h = {
        view: vi.fn(),
        redirect: vi.fn((location) => ({ statusCode: 302, location }))
      }

      const response = await declarationController.post.handler(request, h)

      expect(notificationClient.submitNotification).toHaveBeenCalledWith(
        request,
        'DRAFT.IMP.2026.abc123',
        'trace-abc'
      )
      expect(response).toEqual({ statusCode: 302, location: '/declaration' })
    })

    test('returns 400 with error summary when checkbox is not checked', async () => {
      const get = vi.fn((key) => {
        if (key === 'referenceNumber') return 'DRAFT.IMP.2026.abc123'
        return null
      })
      const request = {
        payload: {},
        yar: { get }
      }
      const mockCode = vi.fn(function (statusCode) {
        return { ...this, statusCode }
      })
      const h = {
        view: vi.fn(() => ({ code: mockCode })),
        redirect: vi.fn()
      }

      const response = await declarationController.post.handler(request, h)

      expect(h.view).toHaveBeenCalledWith(
        'declaration/index',
        expect.objectContaining({
          errorList: expect.arrayContaining([
            expect.objectContaining({
              text: 'Confirm that the information is true and correct before submitting'
            })
          ])
        })
      )
      expect(response.statusCode).toBe(400)
      expect(h.redirect).not.toHaveBeenCalled()
    })

    test('returns 500 with error message when submitNotification throws', async () => {
      vi.spyOn(notificationClient, 'submitNotification').mockRejectedValue(
        new Error('Backend error')
      )

      const get = vi.fn((key) => {
        if (key === 'referenceNumber') return 'DRAFT.IMP.2026.abc123'
        return null
      })
      const request = {
        payload: { declaration: 'confirmed' },
        yar: { get }
      }
      const mockCode = vi.fn(() => ({ statusCode: 500 }))
      const h = {
        view: vi.fn(() => ({ code: mockCode })),
        redirect: vi.fn()
      }

      await declarationController.post.handler(request, h)

      expect(h.view).toHaveBeenCalledWith(
        'declaration/index',
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
