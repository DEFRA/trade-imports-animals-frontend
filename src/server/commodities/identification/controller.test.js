import { beforeEach, describe, expect, test, vi } from 'vitest'

import { animalIdentificationDetailsController } from './controller.js'
import { submitNotification } from '../../common/helpers/notification-helpers.js'
import * as commodityHelpers from '../../common/helpers/commodity-helpers.js'

vi.mock('../../common/helpers/logging/logger.js', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn()
  })
}))

vi.mock('../../common/helpers/notification-helpers.js', () => ({
  submitNotification: vi.fn().mockResolvedValue(undefined)
}))

describe('animalIdentificationDetailsController', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('GET /commodities/identification', () => {
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

      const get = vi.fn((key) => {
        if (key === 'referenceNumber') return 'REF-456'
        if (key === 'commodity') return commodity
        return null
      })

      const request = { yar: { get } }
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
      const get = vi.fn((key) => {
        if (key === 'referenceNumber') return 'REF-1'
        if (key === 'commodity') return { name: 'X', commodityComplement: [] }
        return null
      })

      const request = { yar: { get } }
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

      const get = vi.fn((key) => {
        if (key === 'referenceNumber') return 'REF-NULL'
        if (key === 'commodity') return { name: 'X', commodityComplement: [] }
        return null
      })

      const request = { yar: { get } }
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

  describe('POST /commodities/identification', () => {
    test('Append animal identification details to the species, saves commodity and submits notification', async () => {
      const set = vi.fn()
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

      const get = vi.fn((key) => {
        if (key === 'referenceNumber') return 'REF-789'
        if (key === 'commodity') return commodity
        return null
      })

      const request = {
        payload: {
          'earTag-1586274': 'UK123',
          'earTag-716661': 'UK456',
          'passport-1586274': 'P1',
          'passport-716661': 'P2'
        },
        yar: { set, get }
      }

      const h = {
        redirect: vi.fn((location) => ({ statusCode: 302, location }))
      }

      const response = await animalIdentificationDetailsController.post.handler(
        request,
        h
      )

      // Observable session-write side-effect: species rows are augmented with
      // earTag/passport values keyed off each species value.
      expect(set).toHaveBeenCalledWith(
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
      expect(h.redirect).toHaveBeenCalledWith('/additional-details')
      expect(response).toEqual({
        statusCode: 302,
        location: '/additional-details'
      })
    })

    test('propagates error when backend submit fails', async () => {
      submitNotification.mockRejectedValue(new Error('Backend error'))

      const set = vi.fn()
      const complement = {
        typeOfCommodity: 'Domestic',
        species: [{ value: '1586274', text: '1586274' }]
      }
      const commodity = {
        name: 'Cattle',
        commodityComplement: [complement]
      }

      const get = vi.fn((key) => {
        if (key === 'referenceNumber') return 'REF-ERR'
        if (key === 'commodity') return commodity
        return null
      })

      const request = {
        payload: {
          'earTag-1586274': 'UK1',
          'passport-1586274': 'P1'
        },
        yar: { set, get }
      }

      const h = {
        redirect: vi.fn((location) => ({ statusCode: 302, location }))
      }

      await expect(
        animalIdentificationDetailsController.post.handler(request, h)
      ).rejects.toThrow('Backend error')
    })
  })
})
