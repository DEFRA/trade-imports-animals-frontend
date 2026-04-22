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

describe('#addressSelectController', () => {
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

  test('GET select loads consignors from json file', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/consignor/select',
      auth: {
        strategy: 'session',
        credentials: { user: {}, sessionId: 'TEST_SESSION_ID' }
      }
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toEqual(
      expect.stringContaining('Search for an existing consignor or exporter')
    )
    expect(result).toEqual(expect.stringContaining('Astra Rosales'))
    expect(result).toEqual(expect.stringContaining('EuroStore Services'))
    expect(result).toEqual(expect.stringContaining('Switzerland'))
    expect(result).toEqual(expect.stringContaining('Belgium'))
  })
})
