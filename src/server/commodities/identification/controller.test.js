import { vi } from 'vitest'

import { animalIdentificationDetailsController } from './controller.js'
import { notificationClient } from '../../common/clients/notification-client.js'
import { createServer } from '../../server.js'
import { statusCodes } from '../../common/constants/status-codes.js'
import {
  getSessionValue,
  setSessionValue
} from '../../common/helpers/session-helpers.js'
import * as commodityHelpers from '../../common/helpers/commodity-helpers.js'

import { mockOidcConfig } from '../../common/test-helpers/mock-oidc-config.js'

vi.mock('../../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

vi.mock('../../../config/config.js', async (importOriginal) => {
  const { mockAuthConfig } =
    await import('../../common/test-helpers/mock-auth-config.js')
  return mockAuthConfig(importOriginal)
})

vi.mock('../../common/helpers/session-helpers.js', () => ({
  getSessionValue: vi.fn(),
  setSessionValue: vi.fn()
}))

describe('#animalIdentificationDetailsController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  beforeEach(() => {
    vi.spyOn(notificationClient, 'submit').mockResolvedValue({
      referenceNumber: 'TEST-REF-123'
    })
    getSessionValue.mockReset()
    setSessionValue.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('POST /commodities/identification', () => {
    test('appends animal identification details to the species, saves commodity and submits notification', async () => {
      const complement = {
        typeOfCommodity: 'Domestic',
        species: [
          { value: '1586274', text: '1586274' },
          { value: '716661', text: 'Bison bison' }
        ]
      }
      const commodity = {
        name: 'Cattle',
        commodityComplement: [complement]
      }

      getSessionValue.mockImplementation((_request, key) => {
        if (key === 'referenceNumber') return 'REF-789'
        if (key === 'commodity') return commodity
        return null
      })

      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url: '/commodities/identification',
        auth: {
          strategy: 'session',
          credentials: { user: {}, sessionId: 'TEST_SESSION_ID' }
        },
        payload: {
          'earTag-1586274': 'UK123',
          'earTag-716661': 'UK456',
          'passport-1586274': 'P1',
          'passport-716661': 'P2'
        }
      })

      // Observable session-write side-effect: species rows are augmented with
      // earTag/passport values keyed off each species value.
      expect(setSessionValue).toHaveBeenCalledWith(
        expect.anything(),
        'commodity',
        expect.objectContaining({
          commodityComplement: [
            expect.objectContaining({
              species: [
                expect.objectContaining({
                  value: '1586274',
                  earTag: 'UK123',
                  passport: 'P1'
                }),
                expect.objectContaining({
                  value: '716661',
                  earTag: 'UK456',
                  passport: 'P2'
                })
              ]
            })
          ]
        })
      )

      // Observable network-boundary behaviour: the backend submission was
      // triggered via notificationClient.submit (the fetch wrapper). Asserting
      // here keeps the test decoupled from URL/method/header plumbing inside
      // notificationClient itself.
      expect(notificationClient.submit).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(String)
      )

      expect(statusCode).toBe(302)
      expect(headers.location).toBe('/additional-details')
    })

    test('returns 500 when backend submit fails', async () => {
      const complement = {
        typeOfCommodity: 'Domestic',
        species: [{ value: '1586274', text: '1586274' }]
      }
      const commodity = {
        name: 'Cattle',
        commodityComplement: [complement]
      }

      getSessionValue.mockImplementation((_request, key) => {
        if (key === 'referenceNumber') return 'REF-ERR'
        if (key === 'commodity') return commodity
        return null
      })
      vi.spyOn(notificationClient, 'submit').mockRejectedValue(
        Object.assign(new Error('Backend error'), {
          status: statusCodes.internalServerError,
          statusText: 'Internal Server Error'
        })
      )

      const { statusCode } = await server.inject({
        method: 'POST',
        url: '/commodities/identification',
        auth: {
          strategy: 'session',
          credentials: { user: {}, sessionId: 'TEST_SESSION_ID' }
        },
        payload: {
          'earTag-1586274': 'UK1',
          'passport-1586274': 'P1'
        }
      })

      expect(statusCode).toBe(statusCodes.internalServerError)
    })
  })
})

describe('#animalIdentificationDetailsController (unit)', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('GET handler', () => {
    test('renders view with referenceNumber, commodity, typeOfCommodity, and species from last selected species', () => {
      const commodity = {
        name: 'Cattle',
        commodityComplement: [
          { typeOfCommodity: 'ignored', species: [{ value: 'old' }] },
          {
            typeOfCommodity: 'Domestic',
            species: [
              { value: '1586274', text: '1586274' },
              { value: '716661', text: 'Bison bison' }
            ]
          }
        ]
      }

      getSessionValue.mockImplementation((_request, key) => {
        if (key === 'referenceNumber') return 'REF-456'
        if (key === 'commodity') return commodity
        return null
      })

      const request = {}
      const h = {
        view: vi.fn((template, data) => ({ template, data }))
      }

      const response = animalIdentificationDetailsController.get.handler(
        request,
        h
      )

      expect(h.view).toHaveBeenCalledWith('commodities/identification/index', {
        pageTitle: 'Description of goods',
        heading: 'Commodity',
        referenceNumber: 'REF-456',
        commodity,
        typeOfCommodity: 'Domestic',
        speciesLst: commodity.commodityComplement[1].species,
        commodityDetails: expect.objectContaining({
          code: expect.any(String),
          description: expect.any(String)
        })
      })

      expect(response.template).toBe('commodities/identification/index')
    })

    test('renders with empty species and no typeOfCommodity when no species are selected', () => {
      getSessionValue.mockImplementation((_request, key) => {
        if (key === 'referenceNumber') return 'REF-1'
        if (key === 'commodity') return { name: 'X', commodityComplement: [] }
        return null
      })

      const request = {}
      const h = {
        view: vi.fn((template, data) => ({ template, data }))
      }

      animalIdentificationDetailsController.get.handler(request, h)

      expect(h.view).toHaveBeenCalledWith(
        'commodities/identification/index',
        expect.objectContaining({
          referenceNumber: 'REF-1',
          typeOfCommodity: undefined,
          speciesLst: []
        })
      )
    })

    test('renders with commodityDetails null when mock list is empty', () => {
      vi.spyOn(commodityHelpers, 'toCommodityDetails').mockReturnValueOnce(null)

      getSessionValue.mockImplementation((_request, key) => {
        if (key === 'referenceNumber') return 'REF-NULL'
        if (key === 'commodity') return { name: 'X', commodityComplement: [] }
        return null
      })

      const request = {}
      const h = {
        view: vi.fn((template, data) => ({ template, data }))
      }

      animalIdentificationDetailsController.get.handler(request, h)

      expect(h.view).toHaveBeenCalledWith(
        'commodities/identification/index',
        expect.objectContaining({
          commodityDetails: null
        })
      )
    })
  })
})
