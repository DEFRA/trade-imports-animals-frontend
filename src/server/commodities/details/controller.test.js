import { beforeEach, describe, expect, test, vi } from 'vitest'

import { commodityDetailsController } from './controller.js'
import { submitNotification } from '../../common/helpers/notification-helpers.js'

vi.mock('../../common/helpers/logging/logger.js', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn()
  })
}))

vi.mock('../../common/helpers/notification-helpers.js', () => ({
  submitNotification: vi.fn().mockResolvedValue(undefined)
}))

describe('commodityDetailsController', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('POST /commodities/details', () => {
    test('stores noOfAnimals/noOfPackages against species and totals in commodityComplement, then submits notification and redirects', async () => {
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

      // Observable session-write side-effect: species rows are augmented with
      // noOfAnimals/noOfPackages and totals are summed onto the complement.
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

      // Observable boundary behaviour: the backend submission was triggered.
      // Asserting on submitNotification (the public helper) rather than the
      // internal notificationClient.submit call keeps the test decoupled from
      // tracing-header plumbing inside the helper.
      expect(submitNotification).toHaveBeenCalledWith(
        request,
        expect.objectContaining({
          info: expect.any(Function),
          error: expect.any(Function)
        })
      )

      expect(response).toEqual({
        statusCode: 302,
        location: '/commodities/identification'
      })
    })

    test('propagates error when backend submit fails', async () => {
      submitNotification.mockRejectedValue(new Error('Backend error'))

      const set = vi.fn()
      const get = vi.fn((key) => {
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

      const h = {
        redirect: vi.fn((location) => ({ statusCode: 302, location }))
      }

      await expect(
        commodityDetailsController.post.handler(request, h)
      ).rejects.toThrow('Backend error')
    })
  })
})
