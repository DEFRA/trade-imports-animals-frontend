import { vi } from 'vitest'

import { notificationClient } from '../common/clients/notification-client.js'
import { createServer } from '../server.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { load } from 'cheerio'

describe('#originController', () => {
  let server
  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
    vi.restoreAllMocks()
  })

  describe('GET /origin', () => {
    test('Should render the origin page with expected content', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/origin'
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining('Origin of the import'))
      expect(result).toEqual(expect.stringContaining('Origin of the Import'))
    })

    test('Should display country select dropdown with all EU countries', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/origin'
      })

      expect(statusCode).toBe(statusCodes.ok)

      const $ = load(result)
      const selectOptions = $('#countryCode option')

      expect(selectOptions.length).toBeGreaterThan(25)
      expect(result).toEqual(expect.stringContaining('France'))
      expect(result).toEqual(expect.stringContaining('Germany'))
      expect(result).toEqual(expect.stringContaining('Spain'))
    })

    test('Should render form with radio buttons for region code', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/origin'
      })

      expect(statusCode).toBe(statusCodes.ok)

      const $ = load(result)
      const regionRadios = $('input[name="requiresRegionCode"]')

      expect(regionRadios.length).toBeGreaterThan(0)
      expect(result).toEqual(
        expect.stringContaining(
          'Does the consignment require a region of origin code?'
        )
      )
    })

    test('Should display hint text for region code', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/origin'
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(
        expect.stringContaining(
          'If a region of origin code is required it will be shown on your health certificate'
        )
      )
    })
  })

  describe('POST /origin', () => {
    test('Should save country code to session and redirect', async () => {
      const options = {
        method: 'POST',
        url: '/origin',
        payload: {
          countryCode: 'DE',
          requiresRegionCode: 'no'
        }
      }

      const { statusCode, headers } = await server.inject(options)

      expect(statusCode).toBe(302)
      expect(headers.location).toBe('/commodities')
    })

    test('Should handle different country codes correctly', async () => {
      const countryCodes = ['FR', 'ES', 'IT', 'NL', 'BE']

      for (const code of countryCodes) {
        const options = {
          method: 'POST',
          url: '/origin',
          payload: {
            countryCode: code,
            requiresRegionCode: 'no'
          }
        }

        const { statusCode, headers } = await server.inject(options)

        expect(statusCode).toBe(302)
        expect(headers.location).toBe('/commodities')
      }
    })

    test('Should persist country code across requests', async () => {
      const postResponse = await server.inject({
        method: 'POST',
        url: '/origin',
        payload: {
          countryCode: 'PT',
          requiresRegionCode: 'yes',
          internalReference: 'TEST123'
        }
      })

      expect(postResponse.statusCode).toBe(302)

      const sessionCookie = postResponse.headers['set-cookie']
        ? postResponse.headers['set-cookie'][0].split(';')[0]
        : null

      expect(sessionCookie).toBeTruthy()
    })

    test('Should handle when backend submit fails', async () => {
      notificationClient.submit = vi.fn().mockRejectedValue(
        Object.assign(new Error('Backend error'), {
          status: 500,
          statusText: 'Internal Server Error'
        })
      )

      const options = {
        method: 'POST',
        url: '/origin',
        payload: {
          countryCode: 'IT',
          requiresRegionCode: 'no'
        }
      }

      const { statusCode, headers } = await server.inject(options)

      expect(statusCode).toBe(302)
      expect(headers.location).toBe('/commodities')
    })
  })
})
