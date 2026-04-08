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
            commodity: 'Fish',
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
        location: '/commodities/details'
      })
    })
  })
})
