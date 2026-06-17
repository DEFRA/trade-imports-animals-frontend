import { vi } from 'vitest'
import { createServer } from '../server.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { mockOidcConfig } from '../common/test-helpers/mock-oidc-config.js'

const mockAmendNotification = vi.hoisted(() => vi.fn())

vi.mock('../common/helpers/notification-helpers.js', () => ({
  amendNotification: mockAmendNotification
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

describe('#notificationAmendController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
    vi.restoreAllMocks()
  })

  describe('POST /notification-amend/{referenceNumber}', () => {
    beforeEach(() => {
      mockAmendNotification.mockClear()
    })

    test('Should redirect to /notification-view/{ref} when amend succeeds', async () => {
      mockAmendNotification.mockResolvedValueOnce({})

      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url: '/notification-amend/IMP.GB.2026.1001401',
        auth: sessionAuth('amend-ok')
      })

      expect(statusCode).toBe(statusCodes.redirectFound)
      expect(headers.location).toBe('/notification-view/IMP.GB.2026.1001401')
    })

    test('Should call amendNotification with the reference number', async () => {
      mockAmendNotification.mockResolvedValueOnce({})

      await server.inject({
        method: 'POST',
        url: '/notification-amend/IMP.GB.2026.1001401',
        auth: sessionAuth('amend-call')
      })

      expect(mockAmendNotification).toHaveBeenCalledTimes(1)
      expect(mockAmendNotification).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        'IMP.GB.2026.1001401'
      )
    })

    test('Should render the view with a not-found code when the notification does not exist', async () => {
      const notFoundError = new Error('Not found')
      notFoundError.status = statusCodes.notFound
      mockAmendNotification.mockRejectedValueOnce(notFoundError)

      const { statusCode, payload } = await server.inject({
        method: 'POST',
        url: '/notification-amend/IMP.GB.2026.9999999',
        auth: sessionAuth('amend-404')
      })

      expect(statusCode).toBe(statusCodes.notFound)
      expect(payload).toContain(
        'Sorry, there was a problem starting an amendment for this notification.'
      )
    })

    test('Should render the view with an internal-server-error code when amend fails for any other reason', async () => {
      mockAmendNotification.mockRejectedValueOnce(new Error('Backend error'))

      const { statusCode, payload } = await server.inject({
        method: 'POST',
        url: '/notification-amend/IMP.GB.2026.1001401',
        auth: sessionAuth('amend-500')
      })

      expect(statusCode).toBe(statusCodes.internalServerError)
      expect(payload).toContain(
        'Sorry, there was a problem starting an amendment for this notification.'
      )
    })
  })
})
