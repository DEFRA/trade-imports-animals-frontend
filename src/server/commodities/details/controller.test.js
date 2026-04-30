import { vi } from 'vitest'

import { notificationClient } from '../../common/clients/notification-client.js'
import { createServer } from '../../server.js'
import { statusCodes } from '../../common/constants/status-codes.js'
import {
  getSessionValue,
  setSessionValue
} from '../../common/helpers/session-helpers.js'

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
      // triggered via notificationClient.submit (the fetch wrapper). Asserting
      // here keeps the test decoupled from URL/method/header plumbing inside
      // notificationClient itself.
      expect(notificationClient.submit).toHaveBeenCalledWith(
        expect.anything(),
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

      const { statusCode } = await server.inject({
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
    })
  })
})
