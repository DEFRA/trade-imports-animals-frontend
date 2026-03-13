import { vi } from 'vitest'
import { createServer } from '../server.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { notificationClient } from '../common/clients/notification-client.js'
import { load } from 'cheerio'

describe('#homeController', () => {
  let server

  beforeAll(async () => {
    // Mock notification client to avoid backend calls
    vi.spyOn(notificationClient, 'get').mockResolvedValue(null)
    vi.spyOn(notificationClient, 'submit').mockResolvedValue({
      referenceNumber: 'TEST-REF-123'
    })

    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
    vi.restoreAllMocks()
  })

  test('Should provide expected response', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/'
    })

    expect(result).toEqual(
      expect.stringContaining('Import notification service |')
    )
    expect(statusCode).toBe(statusCodes.ok)
  })

  test('Should display title "Import notification service"', async () => {
    const { result } = await server.inject({
      method: 'GET',
      url: '/'
    })

    expect(result).toEqual(
      expect.stringContaining('Import notification service')
    )
  })

  test('Should display button to create import notification', async () => {
    const { result } = await server.inject({
      method: 'GET',
      url: '/'
    })

    expect(result).toEqual(
      expect.stringContaining('Create an import notification')
    )
    expect(result).toEqual(expect.stringContaining('action="/start-journey"'))
  })

  describe('POST /start-journey', () => {
    test('Should redirect to origin page', async () => {
      const startJourneyResponse = await server.inject({
        method: 'POST',
        url: '/start-journey'
      })

      expect(startJourneyResponse.statusCode).toBe(302)
      expect(startJourneyResponse.headers.location).toBe('/origin')
    })

    test('Should clear session when starting new journey', async () => {
      // Get origin page to establish session
      const initialResponse = await server.inject({
        method: 'GET',
        url: '/origin'
      })

      let sessionCookie =
        initialResponse.headers['set-cookie']?.[0]?.split(';')[0]

      // Post data to set session values (like origin controller does)
      const postResponse = await server.inject({
        method: 'POST',
        url: '/origin',
        headers: {
          cookie: sessionCookie
        },
        payload: {
          countryCode: 'DE',
          requiresRegionCode: 'no',
          internalReference: 'REF999'
        }
      })

      // Update cookie from POST response if provided
      sessionCookie =
        postResponse.headers['set-cookie']?.[0]?.split(';')[0] || sessionCookie

      // Verify data was saved in session
      const verifyResponse = await server.inject({
        method: 'GET',
        url: '/origin',
        headers: {
          cookie: sessionCookie
        }
      })

      const $before = load(verifyResponse.result)
      expect($before('#countryCode').val()).toBe('DE')
      expect($before('#internalReference').val()).toBe('REF999')

      // Start new journey - this should call resetSession
      const startJourneyResponse = await server.inject({
        method: 'POST',
        url: '/start-journey',
        headers: {
          cookie: sessionCookie
        }
      })

      expect(startJourneyResponse.statusCode).toBe(302)

      // The response should have a new session cookie (resetSession creates new ID)
      const newSessionCookie =
        startJourneyResponse.headers['set-cookie']?.[0]?.split(';')[0]

      expect(newSessionCookie).toBeTruthy()
      expect(newSessionCookie).not.toBe(sessionCookie)

      // Verify session was cleared - get origin with new session
      const afterResetResponse = await server.inject({
        method: 'GET',
        url: '/origin',
        headers: {
          cookie: newSessionCookie
        }
      })

      // Should NOT have the old values - fields should be empty
      const $after = load(afterResetResponse.result)
      expect($after('#countryCode').val()).toBe('')
      expect($after('#internalReference').val()).toBe('')
    })
  })
})
