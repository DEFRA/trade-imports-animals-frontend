import { describe, expect, test, vi } from 'vitest'
import { transitedCountriesController } from './controller.js'
import { sessionKeys } from '../common/constants/session-keys.js'
import { SUBMISSION_FAILURE_MESSAGE } from '../common/constants/messages.js'
import { saveNotification } from '../common/helpers/notification-helpers.js'

vi.mock('../common/helpers/notification-helpers.js')

vi.mock('../common/helpers/logging/logger.js', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn()
  })
}))

vi.mock('../common/clients/countries-client.js', () => ({
  countriesClient: {
    getIsoCountries: vi.fn().mockResolvedValue([
      { code: 'FR', name: 'France' },
      { code: 'DE', name: 'Germany' },
      { code: 'NL', name: 'Netherlands' }
    ])
  }
}))

vi.mock('@defra/hapi-tracing', () => ({
  getTraceId: vi.fn().mockReturnValue('test-trace-id')
}))

describe('transitedCountriesController', () => {
  describe('GET /transited-countries', () => {
    test('redirects to transporters when means of transport does not require transit', async () => {
      const get = vi.fn((key) =>
        key === sessionKeys.meansOfTransport ? 'VESSEL' : null
      )
      const request = { yar: { get }, query: {} }
      const h = { redirect: vi.fn((location) => ({ location })) }

      const response = await transitedCountriesController.get.handler(
        request,
        h
      )

      expect(h.redirect).toHaveBeenCalledWith('/transporters')
      expect(response.location).toBe('/transporters')
    })

    test('renders page with selected and available countries', async () => {
      const get = vi.fn((key) => {
        const values = {
          [sessionKeys.meansOfTransport]: 'RAILWAY',
          [sessionKeys.transitedCountries]: ['FR'],
          [sessionKeys.referenceNumber]: 'REF-123'
        }
        return values[key] ?? null
      })
      const request = { yar: { get }, query: {} }
      const h = { view: vi.fn((template, data) => ({ template, data })) }

      const response = await transitedCountriesController.get.handler(
        request,
        h
      )

      expect(h.view).toHaveBeenCalledWith(
        'transited-countries/index',
        expect.objectContaining({
          pageTitle: 'Which countries will the consignment travel through?',
          referenceNumber: 'REF-123',
          selectedCountries: [{ code: 'FR', name: 'France' }],
          searchQuery: '',
          checkboxItems: expect.arrayContaining([
            expect.objectContaining({ value: 'DE', text: 'Germany' })
          ])
        })
      )
      expect(response.template).toBe('transited-countries/index')
    })

    test('filters available countries by search query', async () => {
      const get = vi.fn((key) => {
        const values = {
          [sessionKeys.meansOfTransport]: 'RAILWAY',
          [sessionKeys.transitedCountries]: null
        }
        return values[key] ?? null
      })
      const request = { yar: { get }, query: { q: 'ger' } }
      const h = { view: vi.fn((template, data) => ({ template, data })) }

      await transitedCountriesController.get.handler(request, h)

      expect(h.view).toHaveBeenCalledWith(
        'transited-countries/index',
        expect.objectContaining({
          searchQuery: 'ger',
          checkboxItems: [
            expect.objectContaining({ value: 'DE', text: 'Germany' })
          ]
        })
      )
    })
  })

  describe('POST /transited-countries', () => {
    test('redirects to transporters when means of transport does not require transit', async () => {
      const get = vi.fn((key) =>
        key === sessionKeys.meansOfTransport ? 'AIRPLANE' : null
      )
      const request = {
        payload: { action: 'continue' },
        query: {},
        yar: { get, set: vi.fn() }
      }
      const h = { redirect: vi.fn((location) => ({ location })) }

      const response = await transitedCountriesController.post.handler(
        request,
        h
      )

      expect(h.redirect).toHaveBeenCalledWith('/transporters')
      expect(response.location).toBe('/transporters')
    })

    test('adds selected countries to session and redirects back', async () => {
      const set = vi.fn()
      const get = vi.fn((key) => {
        const values = {
          [sessionKeys.meansOfTransport]: 'ROAD_VEHICLE',
          [sessionKeys.transitedCountries]: ['FR']
        }
        return values[key] ?? null
      })
      const request = {
        payload: {
          transitedCountries: 'DE',
          action: 'add'
        },
        query: {},
        yar: { set, get }
      }
      const h = { redirect: vi.fn((location) => ({ location })) }

      const response = await transitedCountriesController.post.handler(
        request,
        h
      )

      expect(set).toHaveBeenCalledWith(sessionKeys.transitedCountries, [
        'FR',
        'DE'
      ])
      expect(response.location).toBe('/transited-countries')
    })

    test('preserves search query when redirecting after add', async () => {
      const get = vi.fn((key) => {
        const values = {
          [sessionKeys.meansOfTransport]: 'RAILWAY',
          [sessionKeys.transitedCountries]: null
        }
        return values[key] ?? null
      })
      const request = {
        payload: {
          transitedCountries: 'DE',
          action: 'add',
          q: 'ger'
        },
        query: {},
        yar: { set: vi.fn(), get }
      }
      const h = { redirect: vi.fn((location) => ({ location })) }

      const response = await transitedCountriesController.post.handler(
        request,
        h
      )

      expect(response.location).toBe('/transited-countries?q=ger')
    })

    test('removes a country from session and redirects back', async () => {
      const set = vi.fn()
      const get = vi.fn((key) => {
        const values = {
          [sessionKeys.meansOfTransport]: 'RAILWAY',
          [sessionKeys.transitedCountries]: ['FR', 'DE']
        }
        return values[key] ?? null
      })
      const request = {
        payload: { removeCountry: 'FR' },
        query: {},
        yar: { set, get }
      }
      const h = { redirect: vi.fn((location) => ({ location })) }

      const response = await transitedCountriesController.post.handler(
        request,
        h
      )

      expect(set).toHaveBeenCalledWith(sessionKeys.transitedCountries, ['DE'])
      expect(response.location).toBe('/transited-countries')
    })

    test('remove handler delegates to post handler', async () => {
      const set = vi.fn()
      const get = vi.fn((key) => {
        const values = {
          [sessionKeys.meansOfTransport]: 'RAILWAY',
          [sessionKeys.transitedCountries]: ['FR']
        }
        return values[key] ?? null
      })
      const request = {
        payload: { removeCountry: 'FR' },
        query: {},
        yar: { set, get }
      }
      const h = { redirect: vi.fn((location) => ({ location })) }

      const response = await transitedCountriesController.remove.handler(
        request,
        h
      )

      expect(set).toHaveBeenCalledWith(sessionKeys.transitedCountries, null)
      expect(response.location).toBe('/transited-countries')
    })

    test('renders validation error for unknown country codes', async () => {
      const get = vi.fn((key) => {
        const values = {
          [sessionKeys.meansOfTransport]: 'RAILWAY',
          [sessionKeys.transitedCountries]: null
        }
        return values[key] ?? null
      })
      const request = {
        payload: {
          transitedCountries: 'XX',
          action: 'add'
        },
        query: {},
        yar: { get, set: vi.fn() }
      }
      const h = {
        view: vi.fn(() => ({
          code: vi.fn((statusCode) => ({ statusCode }))
        }))
      }

      const response = await transitedCountriesController.post.handler(
        request,
        h
      )

      expect(h.view).toHaveBeenCalledWith(
        'transited-countries/index',
        expect.objectContaining({
          errorList: expect.any(Array),
          fieldErrors: expect.any(Object)
        })
      )
      expect(response.statusCode).toBe(400)
    })

    test('renders error when continuing with no countries selected', async () => {
      const get = vi.fn((key) => {
        const values = {
          [sessionKeys.meansOfTransport]: 'RAILWAY',
          [sessionKeys.transitedCountries]: null
        }
        return values[key] ?? null
      })
      const request = {
        payload: { action: 'continue' },
        query: {},
        yar: { get, set: vi.fn() }
      }
      const h = {
        view: vi.fn(() => ({
          code: vi.fn((statusCode) => ({ statusCode }))
        }))
      }

      const response = await transitedCountriesController.post.handler(
        request,
        h
      )

      expect(h.view).toHaveBeenCalledWith(
        'transited-countries/index',
        expect.objectContaining({
          errorList: [
            expect.objectContaining({
              text: 'Select at least one country the consignment will travel through'
            })
          ]
        })
      )
      expect(response.statusCode).toBe(400)
    })

    test('saves notification and redirects to transporters on continue', async () => {
      const set = vi.fn()
      const get = vi.fn((key) => {
        const values = {
          [sessionKeys.meansOfTransport]: 'RAILWAY',
          [sessionKeys.transitedCountries]: ['FR']
        }
        return values[key] ?? null
      })
      const request = {
        payload: { action: 'continue' },
        query: {},
        yar: { set, get }
      }
      const h = { redirect: vi.fn((location) => ({ location })) }

      const response = await transitedCountriesController.post.handler(
        request,
        h
      )

      expect(saveNotification).toHaveBeenCalled()
      expect(response.location).toBe('/transporters')
    })

    test('merges checked countries into session before continuing', async () => {
      const set = vi.fn()
      const get = vi.fn((key) => {
        const values = {
          [sessionKeys.meansOfTransport]: 'RAILWAY',
          [sessionKeys.transitedCountries]: ['FR']
        }
        return values[key] ?? null
      })
      const request = {
        payload: {
          action: 'continue',
          transitedCountries: 'DE'
        },
        query: {},
        yar: { set, get }
      }
      const h = { redirect: vi.fn((location) => ({ location })) }

      const response = await transitedCountriesController.post.handler(
        request,
        h
      )

      expect(set).toHaveBeenCalledWith(sessionKeys.transitedCountries, [
        'FR',
        'DE'
      ])
      expect(saveNotification).toHaveBeenCalled()
      expect(response.location).toBe('/transporters')
    })

    test('adds with empty selection keeps existing session countries', async () => {
      const set = vi.fn()
      const get = vi.fn((key) => {
        const values = {
          [sessionKeys.meansOfTransport]: 'RAILWAY',
          [sessionKeys.transitedCountries]: ['FR']
        }
        return values[key] ?? null
      })
      const request = {
        payload: { action: 'add' },
        query: {},
        yar: { set, get }
      }
      const h = { redirect: vi.fn((location) => ({ location })) }

      await transitedCountriesController.post.handler(request, h)

      expect(set).toHaveBeenCalledWith(sessionKeys.transitedCountries, ['FR'])
    })

    test('renders error when notification save fails', async () => {
      saveNotification.mockRejectedValueOnce(new Error('save failed'))
      const get = vi.fn((key) => {
        const values = {
          [sessionKeys.meansOfTransport]: 'RAILWAY',
          [sessionKeys.transitedCountries]: ['FR']
        }
        return values[key] ?? null
      })
      const request = {
        payload: { action: 'continue' },
        query: {},
        yar: { get, set: vi.fn() }
      }
      const h = {
        view: vi.fn(() => ({
          code: vi.fn((statusCode) => ({ statusCode }))
        }))
      }

      const response = await transitedCountriesController.post.handler(
        request,
        h
      )

      expect(h.view).toHaveBeenCalledWith(
        'transited-countries/index',
        expect.objectContaining({
          errorList: [{ text: SUBMISSION_FAILURE_MESSAGE }]
        })
      )
      expect(response.statusCode).toBe(500)
    })
  })
})
