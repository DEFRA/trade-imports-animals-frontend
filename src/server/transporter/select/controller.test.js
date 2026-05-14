import { load } from 'cheerio'
import { describe, expect, vi } from 'vitest'

import { createServer } from '../../server.js'
import { statusCodes } from '../../common/constants/status-codes.js'
import { notificationClient } from '../../common/clients/notification-client.js'
import { mockOidcConfig } from '../../common/test-helpers/mock-oidc-config.js'

vi.mock('../../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

vi.mock('../../../config/config.js', async (importOriginal) => {
  const { mockAuthConfig } =
    await import('../../common/test-helpers/mock-auth-config.js')
  return mockAuthConfig(importOriginal)
})

function sessionAuth(sessionId) {
  return {
    strategy: 'session',
    credentials: { user: {}, sessionId }
  }
}

describe('#transporterSelectController', () => {
  let server

  beforeAll(async () => {
    vi.spyOn(notificationClient, 'get').mockResolvedValue(null)
    vi.spyOn(notificationClient, 'save').mockResolvedValue({
      referenceNumber: 'TEST-REF-123'
    })

    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    if (server) {
      await server.stop({ timeout: 0 })
    }
    vi.restoreAllMocks()
  })

  test('GET /transporter/select renders search page with mock transporters', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/transporter/select',
      auth: sessionAuth('transporter-select-get')
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toEqual(
      expect.stringContaining('Search for an existing transporter')
    )
    expect(result).toEqual(
      expect.stringContaining('García Livestock Transport SL')
    )
    expect(result).toEqual(expect.stringContaining('J &amp; G Campbell LTD'))
    expect(result).toEqual(expect.stringContaining('John Gosden LTD'))
    expect(result).toEqual(expect.stringContaining('Switzerland'))
    expect(result).toEqual(expect.stringContaining('Belgium'))
    expect(result).toEqual(expect.stringContaining('Back'))
    expect(result).toContain('href="/transporter"')
  })

  test('GET /transporter/select exposes Select links with correct indices', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/transporter/select',
      auth: sessionAuth('transporter-select-links')
    })

    expect(statusCode).toBe(statusCodes.ok)

    const $ = load(result)
    const selectLinks = $('a[id^="selectedTransporter-"]')

    expect(selectLinks.length).toBe(3)
    expect(selectLinks.eq(0).attr('href')).toBe(
      '/transporter?selectedTransporter=0'
    )
    expect(selectLinks.eq(1).attr('href')).toBe(
      '/transporter?selectedTransporter=1'
    )
    expect(selectLinks.eq(2).attr('href')).toBe(
      '/transporter?selectedTransporter=2'
    )
  })
})
