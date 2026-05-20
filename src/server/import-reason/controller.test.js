import { describe, expect, test, vi } from 'vitest'

import { importReasonController } from './controller.js'
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

describe('importReasonController', () => {
  describe('GET reason for import', () => {
    test('renders view with reasonForImport and calls fetchNotification', async () => {
      fetchNotification.mockResolvedValue(null)

      const get = vi.fn((key) => {
        const values = {
          reasonForImport: 'internalMarket',
          referenceNumber: 'REF-123'
        }
        return values[key] ?? null
      })

      const request = { yar: { get } }
      const h = {
        view: vi.fn((template, data) => ({ template, data }))
      }

      const response = await importReasonController.get.handler(request, h)

      expect(fetchNotification).toHaveBeenCalledWith(
        request,
        expect.objectContaining({
          info: expect.any(Function),
          error: expect.any(Function)
        })
      )

      expect(h.view).toHaveBeenCalledWith('import-reason/index', {
        pageTitle: 'Reason for import',
        heading: 'Reason for import',
        reasonForImport: 'internalMarket',
        referenceNumber: 'REF-123'
      })

      expect(response.template).toBe('import-reason/index')
      expect(response.data.reasonForImport).toBe('internalMarket')
    })

    test('calls fetchNotification even when no referenceNumber (helper handles guard)', async () => {
      fetchNotification.mockResolvedValue(null)

      const get = vi.fn((key) => {
        const values = {
          reasonForImport: 'reEntry',
          referenceNumber: null
        }
        return values[key] ?? null
      })

      const request = { yar: { get } }
      const h = {
        view: vi.fn((template, data) => ({ template, data }))
      }

      await importReasonController.get.handler(request, h)

      expect(fetchNotification).toHaveBeenCalledWith(
        request,
        expect.objectContaining({
          info: expect.any(Function),
          error: expect.any(Function)
        })
      )
      expect(h.view).toHaveBeenCalledWith(
        'import-reason/index',
        expect.objectContaining({
          reasonForImport: 'reEntry',
          referenceNumber: null
        })
      )
    })
  })

  describe('POST reason for import', () => {
    test('stores reasonForImport, submits notification, and redirects', async () => {
      saveNotification.mockResolvedValue({
        referenceNumber: 'REF-123'
      })

      const set = vi.fn()
      const get = vi.fn((key) => (key === 'referenceNumber' ? 'REF-123' : null))

      const request = {
        payload: { reasonForImport: 'internalMarket' },
        yar: { set, get }
      }

      const h = {
        redirect: vi.fn((location) => ({ statusCode: 302, location }))
      }

      const response = await importReasonController.post.handler(request, h)

      expect(set).toHaveBeenCalledWith(
        sessionKeys.reasonForImport,
        'internalMarket'
      )
      expect(saveNotification).toHaveBeenCalledWith(
        request,
        expect.objectContaining({
          info: expect.any(Function),
          error: expect.any(Function)
        })
      )
      expect(response).toEqual({
        statusCode: 302,
        location: '/commodities/details'
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
      const get = vi.fn((key) => (key === 'referenceNumber' ? 'REF-123' : null))

      const request = {
        payload: { reasonForImport: 'reEntry' },
        yar: { set, get }
      }

      const mockCode = vi.fn(() => ({ statusCode: 500 }))
      const h = {
        view: vi.fn(() => ({ code: mockCode })),
        redirect: vi.fn()
      }

      await importReasonController.post.handler(request, h)

      expect(h.view).toHaveBeenCalledWith(
        'import-reason/index',
        expect.objectContaining({
          errorList: [{ text: SUBMISSION_FAILURE_MESSAGE }]
        })
      )
      expect(mockCode).toHaveBeenCalledWith(500)
      expect(h.redirect).not.toHaveBeenCalled()
    })
  })
})
