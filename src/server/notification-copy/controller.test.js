import { vi } from 'vitest'
import { createServer } from '../server.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { mockOidcConfig } from '../common/test-helpers/mock-oidc-config.js'

const mockCopy = vi.hoisted(() => vi.fn())

vi.mock('../common/clients/notification-client.js', () => ({
  notificationClient: {
    copy: mockCopy
  }
}))

vi.mock('../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

function sessionAuth(sessionId) {
  return {
    strategy: 'session',
    credentials: { user: {}, sessionId }
  }
}

describe('#notificationCopyController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
    vi.restoreAllMocks()
  })

  describe('POST /notification-copy/{referenceNumber}', () => {
    beforeEach(() => {
      mockCopy.mockClear()
    })

    describe('When the copy succeeds', () => {
      test('Should redirect to the new notification view page', async () => {
        mockCopy.mockResolvedValueOnce({
          referenceNumber: 'GBN-AG-24-BC3DEF',
          status: 'DRAFT'
        })

        const { statusCode, headers } = await server.inject({
          method: 'POST',
          url: '/notification-copy/GBN-AG-24-AB1234',
          auth: sessionAuth('copy-ok')
        })

        expect(statusCode).toBe(statusCodes.redirectFound)
        expect(headers.location).toBe('/notification-view/GBN-AG-24-BC3DEF')
      })
    })

    describe('When the copy fails', () => {
      test('Should redirect to the source notification view with an error flag', async () => {
        mockCopy.mockRejectedValueOnce(new Error('Backend error'))

        const { statusCode, headers } = await server.inject({
          method: 'POST',
          url: '/notification-copy/GBN-AG-24-AB1234',
          auth: sessionAuth('copy-fail')
        })

        expect(statusCode).toBe(statusCodes.redirectFound)
        expect(headers.location).toBe(
          '/notification-view/GBN-AG-24-AB1234?error=copy'
        )
      })
    })
  })
})
