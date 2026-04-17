import { describe, expect, test, vi } from 'vitest'

import { importReasonController } from './controller.js'

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

describe('importReasonController', () => {
  describe('GET reason for import', () => {
    test('renders view with reasonForImport and calls fetchNotification when referenceNumber exists', () => {
      fetchNotification.mockReturnValue('REF-123')

      const get = vi.fn((key) => {
        const values = {
          reasonForImport: 'internalMarket'
        }
        return values[key] ?? null
      })

      const request = { yar: { get } }
      const h = {
        view: vi.fn((template, data) => ({ template, data }))
      }

      const response = importReasonController.get.handler(request, h)

      expect(fetchNotification).toHaveBeenCalledWith(
        request,
        expect.any(Object)
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

    test('renders view and does not call fetchNotification with referenceNumber when no referenceNumber', () => {
      fetchNotification.mockReturnValue(null)

      const get = vi.fn((key) => {
        const values = {
          reasonForImport: 'reEntry'
        }
        return values[key] ?? null
      })

      const request = { yar: { get } }
      const h = {
        view: vi.fn((template, data) => ({ template, data }))
      }

      importReasonController.get.handler(request, h)

      expect(fetchNotification).toHaveBeenCalledWith(
        request,
        expect.any(Object)
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
      submitNotification.mockResolvedValue(undefined)

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

      expect(set).toHaveBeenCalledWith('reasonForImport', 'internalMarket')
      expect(submitNotification).toHaveBeenCalledWith(
        request,
        'trace-123',
        expect.any(Object)
      )
      expect(response).toEqual({
        statusCode: 302,
        location: '/commodities/details'
      })
    })

    test('redirects even when backend submit fails', async () => {
      submitNotification.mockResolvedValue(undefined)

      const set = vi.fn()
      const get = vi.fn((key) => (key === 'referenceNumber' ? 'REF-123' : null))

      const request = {
        payload: { reasonForImport: 'reEntry' },
        yar: { set, get }
      }

      const h = {
        redirect: vi.fn((location) => ({ statusCode: 302, location }))
      }

      const response = await importReasonController.post.handler(request, h)

      expect(set).toHaveBeenCalledWith('reasonForImport', 'reEntry')
      expect(submitNotification).toHaveBeenCalledWith(
        request,
        'trace-123',
        expect.any(Object)
      )
      expect(response).toEqual({
        statusCode: 302,
        location: '/commodities/details'
      })
    })
  })
})
