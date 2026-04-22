import { describe, expect, test, vi } from 'vitest'

import { commoditiesSelectController } from './controller.js'
import { mockOidcConfig } from '../../common/test-helpers/mock-oidc-config.js'
import { notificationClient } from '../../common/clients/notification-client.js'

vi.mock('../../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

vi.mock('../../../config/config.js', async (importOriginal) => {
  const { mockAuthConfig } =
    await import('../../common/test-helpers/mock-auth-config.js')
  return mockAuthConfig(importOriginal)
})

describe('commoditiesSelectController', () => {
  describe('GET /commodities/select', () => {
    beforeAll(() => {
      vi.spyOn(notificationClient, 'get').mockResolvedValue(null)
      vi.spyOn(notificationClient, 'submit').mockResolvedValue({
        referenceNumber: 'TEST-REF-123'
      })
    })

    afterAll(() => {
      vi.restoreAllMocks()
    })

    test('passes selected type and species from session to the view', async () => {
      const get = vi.fn((key) => {
        const values = {
          commodity: {
            name: 'Fish',
            commodityComplement: [
              {
                typeOfCommodity: 'Domestic',
                species: ['1586274', '716661']
              }
            ]
          },
          referenceNumber: 'REF-123'
        }
        return values[key] ?? null
      })

      const request = {
        yar: { get }
      }

      const h = {
        view: vi.fn((_template, data) => ({ template: _template, data }))
      }

      const response = commoditiesSelectController.get.handler(request, h)

      expect(h.view).toHaveBeenCalledWith(
        'commodities/select/index',
        expect.objectContaining({
          pageTitle: 'Select species of commodity',
          heading: 'Commodity',
          referenceNumber: 'REF-123',
          commodity: {
            name: 'Fish',
            commodityComplement: [
              {
                typeOfCommodity: 'Domestic',
                species: ['1586274', '716661']
              }
            ]
          },
          typeOfCommodity: 'Domestic',
          species: ['1586274', '716661'],
          commodityDetails: expect.objectContaining({
            code: expect.any(String),
            description: expect.any(String)
          }),
          speciesDetails: expect.objectContaining({
            data: expect.objectContaining({
              types: expect.any(Array),
              species: expect.any(Array)
            })
          })
        })
      )

      expect(response.template).toBe('commodities/select/index')
      expect(response.data.typeOfCommodity).toBe('Domestic')
      expect(response.data.species).toEqual(['1586274', '716661'])
    })
  })

  describe('POST /commodities/select', () => {
    beforeAll(() => {
      vi.spyOn(notificationClient, 'get').mockResolvedValue(null)
      vi.spyOn(notificationClient, 'submit').mockResolvedValue({
        referenceNumber: 'TEST-REF-123'
      })
    })

    afterAll(() => {
      vi.restoreAllMocks()
    })

    test('stores selected type and species array in session', async () => {
      const set = vi.fn()
      const get = vi.fn((key) => (key === 'commodity' ? 'Fish' : null))

      const request = {
        payload: {
          typeOfCommodity: 'Domestic',
          species: ['1586274', '716661']
        },
        yar: {
          set,
          get
        }
      }

      const h = {
        redirect: vi.fn((location) => ({ statusCode: 302, location }))
      }

      const response = await commoditiesSelectController.post.handler(
        request,
        h
      )

      expect(set).toHaveBeenCalledTimes(1)
      expect(set).toHaveBeenCalledWith('commodity', {
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
      })
      expect(response).toEqual({
        statusCode: 302,
        location: '/import-reason'
      })
    })

    test('convert single species value into array', async () => {
      const set = vi.fn()

      const request = {
        payload: {
          typeOfCommodity: 'Game',
          species: '716661'
        },
        yar: {
          set,
          get: vi.fn(() => 'Fish')
        }
      }

      const h = {
        redirect: vi.fn((location) => ({ statusCode: 302, location }))
      }

      await commoditiesSelectController.post.handler(request, h)

      expect(set).toHaveBeenCalledTimes(1)
      expect(set).toHaveBeenCalledWith('commodity', {
        name: 'Fish',
        commodityComplement: [
          {
            typeOfCommodity: 'Game',
            species: [{ value: '716661', text: 'Bison bison' }]
          }
        ]
      })
    })

    test('Should propagate error when backend submit fails', async () => {
      const submitError = Object.assign(new Error('Backend error'), {
        status: 500,
        statusText: 'Internal Server Error'
      })

      notificationClient.submit.mockRejectedValue(submitError)

      const set = vi.fn()
      const get = vi.fn((key) => {
        const values = {
          commodity: { name: 'Fish' },
          referenceNumber: 'REF-123'
        }
        return values[key] ?? null
      })

      const request = {
        payload: {
          typeOfCommodity: 'Domestic',
          species: ['1586274', '716661']
        },
        yar: {
          set,
          get
        }
      }

      const h = {
        redirect: vi.fn((location) => ({ statusCode: 302, location }))
      }

      await expect(
        commoditiesSelectController.post.handler(request, h)
      ).rejects.toThrow('Backend error')
    })
  })
})
