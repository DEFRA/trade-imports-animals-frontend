import { vi } from 'vitest'

import { commodityDetailsController } from './controller.js'
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

describe('#commodityDetailsController', () => {
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

  describe('POST /commodities/details', () => {
    test('stores noOfAnimals/noOfPackages against species and totals in commodityComplement, then submits notification and redirects', async () => {
      getSessionValue.mockImplementation((_request, key) => {
        if (key === 'referenceNumber') return 'REF-123'
        if (key === 'commodity') {
          return {
            name: 'Fish',
            commodityComplement: [
              {
                typeOfCommodity: 'Domestic',
                species: [
                  { value: '1586274', text: '1586274' },
                  { value: '716661', text: 'Bison bison' }
                ]
              }
            ]
          }
        }
        return null
      })

      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url: '/commodities/details',
        auth: {
          strategy: 'session',
          credentials: { user: {}, sessionId: 'TEST_SESSION_ID' }
        },
        payload: {
          'noOfAnimals-1586274': '2',
          'noOfAnimals-716661': '3',
          'noOfPackages-1586274': '1',
          'noOfPackages-716661': '4',
          totalNoOfAnimals: '5',
          totalNoOfPackages: '5'
        }
      })

      // Observable session-write side-effect: species rows are augmented with
      // noOfAnimals/noOfPackages and totals are summed onto the complement.
      expect(setSessionValue).toHaveBeenCalledWith(
        expect.anything(),
        'commodity',
        expect.objectContaining({
          commodityComplement: [
            expect.objectContaining({
              species: [
                expect.objectContaining({
                  value: '1586274',
                  noOfAnimals: '2',
                  noOfPackages: '1'
                }),
                expect.objectContaining({
                  value: '716661',
                  noOfAnimals: '3',
                  noOfPackages: '4'
                })
              ],
              totalNoOfAnimals: 5,
              totalNoOfPackages: 5
            })
          ]
        })
      )

      // Observable network-boundary behaviour: the backend submission was
      // triggered via notificationClient.submit (the fetch wrapper) with the
      // same Hapi request that carried this test's POST payload. Asserting on
      // the forwarded payload proves the seeded commodity flowed through the
      // controller; the second arg is the traceId string from @defra/hapi-tracing.
      expect(notificationClient.submit).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            'noOfAnimals-1586274': '2',
            'noOfAnimals-716661': '3',
            'noOfPackages-1586274': '1',
            'noOfPackages-716661': '4',
            totalNoOfAnimals: '5',
            totalNoOfPackages: '5'
          })
        }),
        expect.any(String)
      )

      expect(statusCode).toBe(302)
      expect(headers.location).toBe('/commodities/identification')
    })

    test('returns 500 when backend submit fails', async () => {
      getSessionValue.mockImplementation((_request, key) => {
        if (key === 'commodity') {
          return {
            name: 'Fish',
            commodityComplement: [
              {
                typeOfCommodity: 'Domestic',
                species: [{ value: '1586274', text: '1586274' }]
              }
            ]
          }
        }
        return null
      })
      vi.spyOn(notificationClient, 'submit').mockRejectedValue(
        Object.assign(new Error('Backend error'), {
          status: statusCodes.internalServerError,
          statusText: 'Internal Server Error'
        })
      )

      const { statusCode, result } = await server.inject({
        method: 'POST',
        url: '/commodities/details',
        auth: {
          strategy: 'session',
          credentials: { user: {}, sessionId: 'TEST_SESSION_ID' }
        },
        payload: {
          'noOfAnimals-1586274': '2',
          'noOfPackages-1586274': '1',
          totalNoOfAnimals: '2',
          totalNoOfPackages: '1'
        }
      })

      expect(statusCode).toBe(statusCodes.internalServerError)
      expect(result).toContain(
        'Something went wrong, please contact the EUDP team'
      )
    })
  })
})

describe('#commodityDetailsController (unit)', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('GET handler', () => {
    test('renders view with referenceNumber, commodity, typeOfCommodity, species and totals from last selected species', () => {
      const commodity = {
        name: 'Fish',
        commodityComplement: [
          { typeOfCommodity: 'ignored', species: [{ value: 'old' }] },
          {
            typeOfCommodity: 'Domestic',
            species: [
              { value: '1586274', text: '1586274' },
              { value: '716661', text: 'Bison bison' }
            ],
            totalNoOfAnimals: 5,
            totalNoOfPackages: 5
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

      const response = commodityDetailsController.get.handler(request, h)

      expect(h.view).toHaveBeenCalledWith('commodities/details/index', {
        pageTitle: 'Description of goods',
        heading: 'Commodity',
        referenceNumber: 'REF-456',
        commodity,
        typeOfCommodity: 'Domestic',
        speciesLst: commodity.commodityComplement[1].species,
        totalNoOfAnimals: 5,
        totalNoOfPackages: 5,
        commodityDetails: expect.objectContaining({
          code: expect.any(String),
          description: expect.any(String)
        })
      })

      expect(response.template).toBe('commodities/details/index')
    })

    test('renders with empty species, no typeOfCommodity and zero totals when commodityComplement is empty', () => {
      getSessionValue.mockImplementation((_request, key) => {
        if (key === 'referenceNumber') return 'REF-1'
        if (key === 'commodity') return { name: 'X', commodityComplement: [] }
        return null
      })

      const request = {}
      const h = {
        view: vi.fn((template, data) => ({ template, data }))
      }

      commodityDetailsController.get.handler(request, h)

      expect(h.view).toHaveBeenCalledWith(
        'commodities/details/index',
        expect.objectContaining({
          referenceNumber: 'REF-1',
          typeOfCommodity: undefined,
          speciesLst: [],
          totalNoOfAnimals: 0,
          totalNoOfPackages: 0
        })
      )
    })

    test('renders with commodityDetails null when toCommodityDetails returns null', () => {
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

      commodityDetailsController.get.handler(request, h)

      expect(h.view).toHaveBeenCalledWith(
        'commodities/details/index',
        expect.objectContaining({
          commodityDetails: null
        })
      )
    })
  })
})
