import { vi } from 'vitest'
import { createServer } from '../server.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { mockOidcConfig } from '../common/test-helpers/mock-oidc-config.js'

const mockCancelAmendNotification = vi.hoisted(() => vi.fn())

vi.mock('../common/helpers/notification-helpers.js', () => ({
  cancelAmendNotification: mockCancelAmendNotification
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

const REF = 'GBN-AG-26-ABC123'

describe('#notificationCancelAmendController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    mockCancelAmendNotification.mockClear()
  })

  describe('GET /notification-cancel-amend/{referenceNumber}', () => {
    test('Should render the confirmation page', async () => {
      const { statusCode, payload } = await server.inject({
        method: 'GET',
        url: `/notification-cancel-amend/${REF}`,
        auth: sessionAuth('cancel-amend-get')
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(payload).toContain(
        'Are you sure you want to cancel this amendment?'
      )
      expect(payload).toContain('Yes, cancel amendment')
      expect(payload).toContain('No, return to notification')
      expect(payload).toContain(`/notification-view/${REF}`)
    })
  })

  describe('POST /notification-cancel-amend/{referenceNumber}', () => {
    test('Should redirect to notification view with cancelled query when cancel succeeds', async () => {
      mockCancelAmendNotification.mockResolvedValueOnce({ status: 'SUBMITTED' })

      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url: `/notification-cancel-amend/${REF}`,
        auth: sessionAuth('cancel-amend-post-ok')
      })

      expect(statusCode).toBe(statusCodes.redirectFound)
      expect(headers.location).toBe(`/notification-view/${REF}?cancelled=1`)
      expect(mockCancelAmendNotification).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        REF
      )
    })

    test('Should render confirmation page with not-found code when notification does not exist', async () => {
      const notFoundError = new Error('Not found')
      notFoundError.status = statusCodes.notFound
      mockCancelAmendNotification.mockRejectedValueOnce(notFoundError)

      const { statusCode, payload } = await server.inject({
        method: 'POST',
        url: `/notification-cancel-amend/${REF}`,
        auth: sessionAuth('cancel-amend-404')
      })

      expect(statusCode).toBe(statusCodes.notFound)
      expect(payload).toContain(
        'Sorry, there was a problem cancelling this amendment.'
      )
    })

    test('Should render confirmation page with internal-server-error when cancel fails', async () => {
      mockCancelAmendNotification.mockRejectedValueOnce(
        new Error('Backend error')
      )

      const { statusCode, payload } = await server.inject({
        method: 'POST',
        url: `/notification-cancel-amend/${REF}`,
        auth: sessionAuth('cancel-amend-500')
      })

      expect(statusCode).toBe(statusCodes.internalServerError)
      expect(payload).toContain(
        'Sorry, there was a problem cancelling this amendment.'
      )
    })
  })
})
