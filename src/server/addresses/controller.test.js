import { beforeEach, describe, expect, test, vi } from 'vitest'

import { addressesController } from './controller.js'
import {
  fetchNotification,
  submitNotification
} from '../common/helpers/notification-helpers.js'
import { statusCodes } from '../common/constants/status-codes.js'

const REFERENCE_NUMBER = 'REF-123'
const CPH_NUMBER_PATH = '/cph-number'

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
  fetchNotification: vi.fn().mockResolvedValue({ referenceNumber: 'REF-123' }),
  submitNotification: vi.fn().mockResolvedValue(undefined)
}))

const makeYar = (values = {}) => ({
  get: vi.fn((key) => values[key] ?? null),
  set: vi.fn()
})

const makeViewToolkit = () => ({
  view: vi.fn((template, data) => ({ template, data }))
})

const makeRedirectToolkit = () => ({
  redirect: vi.fn((location) => ({
    statusCode: statusCodes.redirectFound,
    location
  }))
})

describe('addressesController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /addresses', () => {
    test('renders addresses page using fetchNotification for referenceNumber', async () => {
      fetchNotification.mockResolvedValue({ referenceNumber: REFERENCE_NUMBER })

      const request = { query: {}, yar: makeYar({ commodity: 'Fish' }) }
      const h = makeViewToolkit()

      const response = await addressesController.get.handler(request, h)

      expect(fetchNotification).toHaveBeenCalledWith(
        request,
        expect.any(Object)
      )
      expect(h.view).toHaveBeenCalledWith('addresses/index', {
        pageTitle: 'Addresses',
        heading: 'Addresses',
        captionText: 'Notification details',
        referenceNumber: REFERENCE_NUMBER,
        selectedConsignor: null,
        selectedDestination: null
      })
      expect(response.template).toBe('addresses/index')
    })

    test('renders addresses page with no referenceNumber when fetchNotification returns null', async () => {
      fetchNotification.mockResolvedValue(null)

      const request = { query: {}, yar: makeYar({ commodity: 'Fish' }) }
      const h = makeViewToolkit()

      const response = await addressesController.get.handler(request, h)

      expect(h.view).toHaveBeenCalledWith('addresses/index', {
        pageTitle: 'Addresses',
        heading: 'Addresses',
        captionText: 'Notification details',
        referenceNumber: undefined,
        selectedConsignor: null,
        selectedDestination: null
      })
      expect(response.template).toBe('addresses/index')
    })

    test('saves selected consignor and destination from query into session', async () => {
      fetchNotification.mockResolvedValue({ referenceNumber: REFERENCE_NUMBER })

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
      const request = {
        query: { selectedConsignor: '0', selectedDestination: '0' },
        yar: makeYar({
          consignor: selectedConsignor,
          destination: selectedDestination
        })
      }
      const h = makeViewToolkit()

      await addressesController.get.handler(request, h)

      expect(request.yar.set).toHaveBeenCalledWith(
        'consignor',
        selectedConsignor
      )
      expect(request.yar.set).toHaveBeenCalledWith(
        'destination',
        selectedDestination
      )
      expect(h.view).toHaveBeenCalledWith(
        'addresses/index',
        expect.objectContaining({
          selectedConsignor,
          selectedDestination
        })
      )
    })
  })

  describe('POST /addresses', () => {
    test('submits notification and redirects to /cph-number', async () => {
      submitNotification.mockResolvedValue(undefined)

      const request = {}
      const h = makeRedirectToolkit()

      const response = await addressesController.post.handler(request, h)

      expect(submitNotification).toHaveBeenCalledWith(
        request,
        expect.any(Object)
      )
      expect(h.redirect).toHaveBeenCalledWith(CPH_NUMBER_PATH)
      expect(response).toEqual({
        statusCode: statusCodes.redirectFound,
        location: CPH_NUMBER_PATH
      })
    })

    test('still redirects to /cph-number when submitNotification throws', async () => {
      submitNotification.mockRejectedValue(new Error('Backend error'))

      const request = {}
      const h = makeRedirectToolkit()

      const response = await addressesController.post.handler(request, h)

      expect(submitNotification).toHaveBeenCalledWith(
        request,
        expect.any(Object)
      )
      expect(h.redirect).toHaveBeenCalledWith(CPH_NUMBER_PATH)
      expect(response).toEqual({
        statusCode: statusCodes.redirectFound,
        location: CPH_NUMBER_PATH
      })
    })
  })
})
