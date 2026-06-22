import { describe, expect, test, vi } from 'vitest'

import { addressesController } from './controller.js'
import { sessionKeys } from '../common/constants/session-keys.js'
import { saveNotification } from '../common/helpers/notification-helpers.js'

vi.mock('../common/helpers/notification-helpers.js')

vi.mock('../common/helpers/logging/logger.js', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn()
  })
}))

describe('addressesController', () => {
  describe('GET /addresses', () => {
    test('renders addresses page with null session values when nothing selected', () => {
      const get = vi.fn((key) => {
        const values = {
          referenceNumber: 'REF-123',
          placeOfOrigin: null,
          consignor: null,
          consignee: null,
          importer: null,
          destination: null,
          cphNumber: null
        }
        return values[key] ?? null
      })
      const set = vi.fn()

      const request = { query: {}, yar: { get, set } }
      const h = {
        view: vi.fn((template, data) => ({ template, data }))
      }

      const response = addressesController.get.handler(request, h)

      expect(h.view).toHaveBeenCalledWith('addresses/index', {
        pageTitle: 'Addresses',
        referenceNumber: 'REF-123',
        selectedPlaceOfOrigin: null,
        selectedConsignor: null,
        selectedConsignee: null,
        selectedImporter: null,
        selectedDestination: null,
        selectedCphNumber: null
      })
      expect(response.template).toBe('addresses/index')
    })

    test('passes all selected operator session values to view', () => {
      const placeOfOrigin = {
        name: 'Origin Farm',
        address: { addressLine1: '1 Farm Lane', country: 'Ireland' }
      }
      const consignor = {
        name: 'Astra Rosales',
        address: {
          addressLine1: '43 East Hague Extension',
          addressLine2: 'Delectus sitodio p. Laborum Odio tempor',
          addressLine3: 'Quasoccaecat ut ear, 30055',
          country: 'Switzerland'
        }
      }
      const consignee = {
        name: 'Consignee Ltd',
        address: { addressLine1: '10 Main Street', country: 'United Kingdom' }
      }
      const importer = {
        name: 'Import Co',
        address: { addressLine1: '20 Trade Road', country: 'United Kingdom' }
      }
      const destination = {
        name: 'Tech Imports Ltd',
        address: {
          addressLine1: '643 Main Street',
          addressLine2: 'Birmingham G1 3AZ',
          country: 'United Kingdom'
        }
      }
      const cphNumber = '123456789'

      const get = vi.fn((key) => {
        const values = {
          referenceNumber: 'REF-123',
          placeOfOrigin,
          consignor,
          consignee,
          importer,
          destination,
          cphNumber
        }
        return values[key] ?? null
      })
      const set = vi.fn()

      const request = { query: {}, yar: { get, set } }
      const h = {
        view: vi.fn((template, data) => ({ template, data }))
      }

      addressesController.get.handler(request, h)

      expect(h.view).toHaveBeenCalledWith('addresses/index', {
        pageTitle: 'Addresses',
        referenceNumber: 'REF-123',
        selectedPlaceOfOrigin: placeOfOrigin,
        selectedConsignor: consignor,
        selectedConsignee: consignee,
        selectedImporter: importer,
        selectedDestination: destination,
        selectedCphNumber: cphNumber
      })
    })

    test('saves selected consignor from query param into session', () => {
      const selectedConsignor = {
        name: 'Astra Rosales',
        address: {
          addressLine1: '43 East Hague Extension',
          addressLine2: 'Delectus sitodio p. Laborum Odio tempor',
          addressLine3: 'Quasoccaecat ut ear, 30055',
          country: 'Switzerland'
        }
      }
      const selectedDestination = {
        name: 'Tech Imports Ltd',
        address: {
          addressLine1: '643 Main Street',
          addressLine2: 'Birmingham G1 3AZ',
          country: 'United Kingdom'
        }
      }
      const get = vi.fn((key) => {
        const values = {
          referenceNumber: 'REF-123',
          consignor: selectedConsignor,
          destination: selectedDestination
        }
        return values[key] ?? null
      })
      const set = vi.fn()

      const request = {
        query: { selectedConsignor: '0', selectedDestination: '0' },
        yar: { get, set }
      }
      const h = {
        view: vi.fn((template, data) => ({ template, data }))
      }

      addressesController.get.handler(request, h)

      expect(set).toHaveBeenCalledWith(sessionKeys.consignor, {
        name: 'Astra Rosales',
        address: {
          addressLine1: '43 East Hague Extension',
          addressLine2: 'Delectus sitodio p. Laborum Odio tempor',
          addressLine3: 'Quasoccaecat ut ear, 30055',
          country: 'Switzerland'
        }
      })
      expect(set).toHaveBeenCalledWith(sessionKeys.destination, {
        name: 'Tech Imports Ltd',
        address: {
          addressLine1: '643 Main Street',
          addressLine2: 'Birmingham G1 3AZ',
          country: 'United Kingdom'
        }
      })
      expect(h.view).toHaveBeenCalledWith(
        'addresses/index',
        expect.objectContaining({
          selectedConsignor
        })
      )
    })
  })

  test('redirects to port-of-entry when notification client throws', async () => {
    saveNotification.mockRejectedValueOnce(new Error('Backend error'))

    const get = createYarGet()

    const request = { yar: { get } }
    const redirect = createRedirect()
    const h = {
      redirect
    }

    const response = await addressesController.post.handler(request, h)

    expect(saveNotification).toHaveBeenCalledWith(
      request,
      expect.objectContaining({
        info: expect.any(Function),
        error: expect.any(Function)
      })
    )
    expect(h.redirect).toHaveBeenCalledWith('/port-of-entry', {
      referenceNumber: 'REF-123'
    })
    expect(response).toEqual({
      statusCode: 302,
      location: '/port-of-entry',
      opts: {
        referenceNumber: 'REF-123'
      }
    })
  })

  describe('POST /addresses', () => {
    test('saves notification and redirects to port-of-entry', async () => {
      const set = vi.fn()
      const get = createYarGet()

      const request = {
        yar: { get, set }
      }
      const redirect = createRedirect()
      const h = { redirect }

      const response = await addressesController.post.handler(request, h)

      expect(saveNotification).toHaveBeenCalledWith(
        request,
        expect.objectContaining({
          info: expect.any(Function),
          error: expect.any(Function)
        })
      )
      expect(h.redirect).toHaveBeenCalledWith('/port-of-entry', {
        referenceNumber: 'REF-123'
      })
      expect(response).toEqual({
        statusCode: 302,
        location: '/port-of-entry',
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
    destination: {
      name: 'Global Trading Co',
      address: {
        addressLine1: '945 Main Street',
        addressLine2: 'London LS1 5AB',
        country: 'United Kingdom'
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
