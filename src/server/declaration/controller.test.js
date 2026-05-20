import { describe, expect, test, vi } from 'vitest'
import { declarationController } from './controller.js'
import { SUBMISSION_FAILURE_MESSAGE } from '../common/constants/messages.js'

const { mockSubmitNotification } = vi.hoisted(() => ({
  mockSubmitNotification: vi.fn()
}))

vi.mock('../common/helpers/notification-helpers.js', () => ({
  submitNotification: mockSubmitNotification
}))

vi.mock('../common/helpers/logging/logger.js', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn()
  })
}))

describe('declarationController', () => {
  function buildRequest(payload = {}) {
    const get = vi.fn((key) =>
      key === 'referenceNumber' ? 'DRAFT.IMP.2026.abc123' : null
    )
    return { payload, yar: { get } }
  }

  function buildErrorH() {
    const mockCode = vi.fn((statusCode) => ({ statusCode }))
    const h = {
      view: vi.fn(() => ({ code: mockCode })),
      redirect: vi.fn()
    }
    return { mockCode, h }
  }

  describe('GET /declaration', () => {
    test('renders view with referenceNumber and submissionDate from session', () => {
      const request = buildRequest()
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
      mockSubmitNotification.mockResolvedValue({})

      const request = buildRequest({ declaration: 'confirmed' })
      const h = {
        view: vi.fn(),
        redirect: vi.fn((location) => ({ statusCode: 302, location }))
      }

      const response = await declarationController.post.handler(request, h)

      expect(mockSubmitNotification).toHaveBeenCalledWith(
        request,
        expect.objectContaining({
          info: expect.any(Function),
          error: expect.any(Function)
        }),
        'DRAFT.IMP.2026.abc123'
      )
      expect(response).toEqual({ statusCode: 302, location: '/declaration' })
    })

    test('returns 400 with error summary when checkbox is not checked', async () => {
      const request = buildRequest({})
      const { h } = buildErrorH()

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
      mockSubmitNotification.mockRejectedValueOnce(new Error('Backend error'))

      const request = buildRequest({ declaration: 'confirmed' })
      const { mockCode, h } = buildErrorH()

      await declarationController.post.handler(request, h)

      expect(h.view).toHaveBeenCalledWith(
        'declaration/index',
        expect.objectContaining({
          errorList: [{ text: SUBMISSION_FAILURE_MESSAGE }]
        })
      )
      expect(mockCode).toHaveBeenCalledWith(500)
      expect(h.redirect).not.toHaveBeenCalled()
    })
  })
})
