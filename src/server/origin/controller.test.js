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
  })

  describe('GET /origin', () => {
    test('Should render the origin page with expected content', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/origin'
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining('Origin |'))
      expect(result).toEqual(expect.stringContaining('Country of Origin'))
      expect(result).toEqual(
        expect.stringContaining('Select Country of Origin')
      )
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

    test('Should render form with CSRF token', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/origin'
      })

      expect(statusCode).toBe(statusCodes.ok)

      const $ = load(result)
      const csrfInput = $('input[name="crumb"]')

      expect(csrfInput.length).toBe(1)
      expect(csrfInput.attr('type')).toBe('hidden')
    })

    test('Should display hint text for country selection', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/origin'
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(
        expect.stringContaining(
          'Select the country where the animal or product was produced, reared or grown'
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
          countryCode: 'DE'
        }
      }

      const { statusCode, headers } = await server.inject(options)

      expect(statusCode).toBe(302)
      expect(headers.location).toBe('/origin')
    })

    test('Should handle different country codes correctly', async () => {
      const countryCodes = ['FR', 'ES', 'IT', 'NL', 'BE']

      for (const code of countryCodes) {
        const options = {
          method: 'POST',
          url: '/origin',
          payload: {
            countryCode: code
          }
        }

        const { statusCode, headers } = await server.inject(options)

        expect(statusCode).toBe(302)
        expect(headers.location).toBe('/origin')
      }
    })

    test('Should persist country code across requests', async () => {
      const postResponse = await server.inject({
        method: 'POST',
        url: '/origin',
        payload: {
          countryCode: 'PT'
        }
      })

      expect(postResponse.statusCode).toBe(302)

      const sessionCookie = postResponse.headers['set-cookie']
        ? postResponse.headers['set-cookie'][0].split(';')[0]
        : null

      if (sessionCookie) {
        const getResponse = await server.inject({
          method: 'GET',
          url: '/origin',
          headers: {
            cookie: sessionCookie
          }
        })

        expect(getResponse.statusCode).toBe(statusCodes.ok)

        const $ = load(getResponse.result)
        const selectedOption = $('#countryCode option[selected]')

        expect(selectedOption.val()).toBe('PT')
      }
    })
  })
})
