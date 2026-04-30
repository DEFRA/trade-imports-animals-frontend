import { vi } from 'vitest'

import { createServer } from '../../../server.js'
import { statusCodes } from '../../../common/constants/status-codes.js'
import { notificationClient } from '../../../common/clients/notification-client.js'
import { mockOidcConfig } from '../../../common/test-helpers/mock-oidc-config.js'

vi.mock('../../../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

vi.mock('../../../../config/config.js', async (importOriginal) => {
  const { mockAuthConfig } =
    await import('../../../common/test-helpers/mock-auth-config.js')
  return mockAuthConfig(importOriginal)
})

describe('#destinationsSelectController', () => {
  let server

  beforeAll(async () => {
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

  test('GET /destinations/select loads destinations from mock JSON', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/destinations/select',
      auth: {
        strategy: 'session',
        credentials: { user: {}, sessionId: 'TEST_SESSION_ID' }
      }
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toEqual(
      expect.stringContaining('Search for a place of destination')
    )
    expect(result).toEqual(expect.stringContaining('Tech Imports Ltd'))
    expect(result).toEqual(expect.stringContaining('United Commerce'))
    expect(result).toEqual(expect.stringContaining('Global Trading Co'))
    expect(result).toEqual(expect.stringContaining('United Kingdom'))
  })
})
