import { vi } from 'vitest'
import { createServer } from '../server.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { mockOidcConfig } from '../common/test-helpers/mock-oidc-config.js'

const mockDeleteNotification = vi.hoisted(() => vi.fn())

vi.mock('../common/helpers/notification-helpers.js', () => ({
  deleteNotification: mockDeleteNotification
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

describe('#notificationDeleteController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
    vi.restoreAllMocks()
  })

  describe('POST /notification-delete/{referenceNumber}', () => {
    beforeEach(() => {
      mockDeleteNotification.mockClear()
    })

    test('Should return 200 and { deleted: true } when soft delete succeeds', async () => {
      mockDeleteNotification.mockResolvedValueOnce({})

      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: '/notification-delete/IMP.GB.2026.1001401',
        auth: sessionAuth('delete-ok')
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual({ deleted: true })
    })

    test('Should call deleteNotification with the reference number', async () => {
      mockDeleteNotification.mockResolvedValueOnce({})

      await server.inject({
        method: 'POST',
        url: '/notification-delete/IMP.GB.2026.1001401',
        auth: sessionAuth('delete-call')
      })

      expect(mockDeleteNotification).toHaveBeenCalledTimes(1)
      expect(mockDeleteNotification).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        'IMP.GB.2026.1001401'
      )
    })

    test('Should return 404 when notification is not found', async () => {
      const notFoundError = new Error('Not found')
      notFoundError.status = statusCodes.notFound
      mockDeleteNotification.mockRejectedValueOnce(notFoundError)

      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: '/notification-delete/IMP.GB.2026.9999999',
        auth: sessionAuth('delete-404')
      })

      expect(statusCode).toBe(statusCodes.notFound)
      expect(result).toEqual({ error: 'Failed to delete notification' })
    })

    test('Should return 500 when delete fails for any other reason', async () => {
      mockDeleteNotification.mockRejectedValueOnce(new Error('Backend error'))

      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: '/notification-delete/IMP.GB.2026.1001401',
        auth: sessionAuth('delete-500')
      })

      expect(statusCode).toBe(statusCodes.internalServerError)
      expect(result).toEqual({ error: 'Failed to delete notification' })
    })
  })
})
