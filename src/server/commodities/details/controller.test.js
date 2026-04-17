import { describe, expect, test, vi } from 'vitest'

import { commodityDetailsController } from './controller.js'
import { notificationClient } from '../../common/clients/notification-client.js'

vi.mock('@defra/hapi-tracing', () => ({
  getTraceId: vi.fn(() => 'trace-123')
}))

vi.mock('../../common/helpers/logging/logger.js', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn()
  })
}))

describe('commodityDetailsController', () => {
  describe('POST /commodities/details', () => {
    test('stores noOfAnimals/noOfPackages against species and totals in commodityComplement', async () => {
      vi.spyOn(notificationClient, 'submit').mockResolvedValue({
        referenceNumber: 'REF-123'
      })

      const set = vi.fn()
      const get = vi.fn((key) => {
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

      const request = {
        payload: {
          'noOfAnimals-1586274': '2',
          'noOfAnimals-716661': '3',
          'noOfPackages-1586274': '1',
          'noOfPackages-716661': '4',
          totalNoOfAnimals: '5',
          totalNoOfPackages: '5'
        },
        yar: { set, get }
      }

      const h = {
        redirect: vi.fn((location) => ({ statusCode: 302, location }))
      }

      const response = await commodityDetailsController.post.handler(request, h)

      expect(set).toHaveBeenCalledWith(
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

      expect(notificationClient.submit).toHaveBeenCalledWith(
        request,
        'trace-123'
      )
      expect(response).toEqual({
        statusCode: 302,
        location: '/commodities/identification'
      })
    })

    test('shows error page when backend submit fails', async () => {
      vi.spyOn(notificationClient, 'submit').mockRejectedValue(
        Object.assign(new Error('Backend error'), {
          status: 500,
          statusText: 'Internal Server Error'
        })
      )

      const set = vi.fn()
      const get = vi.fn((key) => {
        if (key === 'referenceNumber') return 'REF-123'
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

      const request = {
        payload: {
          'noOfAnimals-1586274': '2',
          'noOfPackages-1586274': '1',
          totalNoOfAnimals: '2',
          totalNoOfPackages: '1'
        },
        yar: { set, get }
      }

      const mockCode = vi.fn(() => ({ statusCode: 500 }))
      const h = {
        view: vi.fn(() => ({ code: mockCode })),
        redirect: vi.fn()
      }

      await commodityDetailsController.post.handler(request, h)

      expect(h.view).toHaveBeenCalledWith(
        'commodities/details/index',
        expect.objectContaining({
          errorList: [
            { text: 'Something went wrong, please contact the EUDP team' }
          ]
        })
      )
      expect(mockCode).toHaveBeenCalledWith(500)
      expect(h.redirect).not.toHaveBeenCalled()
    })
  })
})
