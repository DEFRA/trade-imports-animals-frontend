import { describe, expect, test, vi } from 'vitest'

import { importReasonController } from './controller.js'
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

describe('importReasonController', () => {
  describe('GET reason for import', () => {
    test('renders view with reasonForImport and calls notificationClient.get when referenceNumber exists', () => {
      vi.spyOn(notificationClient, 'get').mockResolvedValue(null)

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

      const response = importReasonController.get.handler(request, h)

      expect(notificationClient.get).toHaveBeenCalledWith(
        request,
        'REF-123',
        'trace-123'
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

    test('renders view and does not call notificationClient.get when no referenceNumber', () => {
      const getSpy = vi.spyOn(notificationClient, 'get').mockResolvedValue(null)

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

      importReasonController.get.handler(request, h)

      expect(getSpy).not.toHaveBeenCalled()
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
      vi.spyOn(notificationClient, 'submit').mockResolvedValue({
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

      expect(set).toHaveBeenCalledWith('reasonForImport', 'internalMarket')
      expect(notificationClient.submit).toHaveBeenCalledWith(
        request,
        'trace-123'
      )
      expect(response).toEqual({
        statusCode: 302,
        location: '/commodities/details'
      })
    })

    test('redirects even when backend submit fails', async () => {
      vi.spyOn(notificationClient, 'submit').mockRejectedValue(
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

      const h = {
        redirect: vi.fn((location) => ({ statusCode: 302, location }))
      }

      const response = await importReasonController.post.handler(request, h)

      expect(set).toHaveBeenCalledWith('reasonForImport', 'reEntry')
      expect(notificationClient.submit).toHaveBeenCalledWith(
        request,
        'trace-123'
      )
      expect(response).toEqual({
        statusCode: 302,
        location: '/commodities/details'
      })
    })
  })
})
