import { describe, expect, test, vi } from 'vitest'

import { consignorAddressController } from './controller.js'
import { notificationClient } from '../../common/clients/notification-client.js'

vi.mock('@defra/hapi-tracing', () => ({
  getTraceId: vi.fn(() => 'trace-123')
}))

vi.mock('../common/helpers/logging/logger.js', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn()
  })
}))

describe('addressesController', () => {
  describe('GET /addresses', () => {
    test('renders addresses search page using session referenceNumber', () => {
      const get = vi.fn((key) => {
        const values = {
          referenceNumber: 'REF-123',
          selectedConsignor: null
        }
        return values[key] ?? null
      })
      const set = vi.fn()

      const request = { query: {}, yar: { get, set } }
      const h = {
        view: vi.fn((template, data) => ({ template, data }))
      }

      const response = consignorAddressController.get.handler(request, h)

      expect(h.view).toHaveBeenCalledWith('consignor/address/index', {
        pageTitle: 'Addresses',
        heading: 'Addresses',
        referenceNumber: 'REF-123',
        selectedConsignor: null
      })
      expect(response.template).toBe('consignor/address/index')
    })

    test('saves selected consignor from query and redirects to the address landing page', () => {
      const selectedConsignor = {
        name: 'Astra Rosales',
        address: {
          addressLine1: '43 East Hague Extension',
          addressLine2: 'Delectus sitodio p. Laborum Odio tempor',
          addressLine3: 'Quasoccaecat ut ear, 30055',
          country: 'Switzerland'
        }
      }
      const get = vi.fn((key) => {
        const values = {
          referenceNumber: 'REF-123',
          consignor: selectedConsignor
        }
        return values[key] ?? null
      })
      const set = vi.fn()

      const request = {
        query: { selectedConsignor: '0' },
        yar: { get, set }
      }
      const h = {
        view: vi.fn((template, data) => ({ template, data }))
      }

      consignorAddressController.get.handler(request, h)

      expect(set).toHaveBeenCalledWith('consignor', {
        name: 'Astra Rosales',
        address: {
          addressLine1: '43 East Hague Extension',
          addressLine2: 'Delectus sitodio p. Laborum Odio tempor',
          addressLine3: 'Quasoccaecat ut ear, 30055',
          country: 'Switzerland'
        }
      })
      expect(h.view).toHaveBeenCalledWith(
        'consignor/address/index',
        expect.objectContaining({
          selectedConsignor
        })
      )
    })
  })

  test('redirects to cph-number when notification client throws', async () => {
    vi.spyOn(notificationClient, 'submit').mockRejectedValue(
      new Error('Backend error')
    )

    const get = createYarGet()

    const request = { yar: { get } }
    const redirect = createRedirect()
    const h = {
      redirect
    }

    const response = await consignorAddressController.post.handler(request, h)

    expect(notificationClient.submit).toHaveBeenCalledWith(request, 'trace-123')
    expect(h.redirect).toHaveBeenCalledWith('/cph-number', {
      referenceNumber: 'REF-123'
    })
    expect(response).toEqual({
      statusCode: 302,
      location: '/cph-number',
      opts: {
        referenceNumber: 'REF-123'
      }
    })
  })

  describe('POST addresses', () => {
    test('submit notification with selected consignor', async () => {
      vi.spyOn(notificationClient, 'submit').mockResolvedValue({
        referenceNumber: 'REF-123'
      })

      const set = vi.fn()
      const get = createYarGet()

      const request = {
        yar: { get, set }
      }
      const redirect = createRedirect()
      const h = { redirect }

      const response = await consignorAddressController.post.handler(request, h)

      expect(notificationClient.submit).toHaveBeenCalledWith(
        request,
        'trace-123'
      )
      expect(h.redirect).toHaveBeenCalledWith('/cph-number', {
        referenceNumber: 'REF-123'
      })
      expect(response).toEqual({
        statusCode: 302,
        location: '/cph-number',
        opts: {
          referenceNumber: 'REF-123'
        }
      })
      expect(set).not.toHaveBeenCalledWith(expect.anything())
    })
  })
})

function createYarGet(overrides = {}) {
  const values = {
    referenceNumber: 'REF-123',
    consignor: {
      name: 'Astra Rosales',
      address: {
        addressLine1: '43 East Hague Extension',
        country: 'Switzerland'
      }
    },
    ...overrides
  }
  return vi.fn((key) => values[key] ?? null)
}

function createRedirect() {
  return vi.fn((location, opts) => ({
    statusCode: 302,
    location,
    opts
  }))
}
