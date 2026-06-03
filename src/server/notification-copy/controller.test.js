import { vi } from 'vitest'
import { statusCodes } from '../common/constants/status-codes.js'
import { notificationClient } from '../common/clients/notification-client.js'
import { notificationCopyController } from './controller.js'

const mockLoggerError = vi.fn()

vi.mock('../common/clients/notification-client.js', () => ({
  notificationClient: {
    copy: vi.fn()
  }
}))

vi.mock('../common/helpers/logging/logger.js', () => ({
  createLogger: () => ({
    error: (...args) => mockLoggerError(...args)
  })
}))

vi.mock('@defra/hapi-tracing', () => ({
  getTraceId: vi.fn(() => 'trace-abc')
}))

describe('#notificationCopyController', () => {
  const referenceNumber = 'REF-123'
  const newReferenceNumber = 'REF-456'

  let request
  let h

  beforeEach(() => {
    request = { params: { referenceNumber } }
    h = {
      redirect: vi.fn((location) => ({
        statusCode: statusCodes.redirectFound,
        location
      }))
    }
    mockLoggerError.mockClear()
    vi.clearAllMocks()
  })

  describe('When the copy succeeds', () => {
    test('Should redirect to the new notification view page', async () => {
      notificationClient.copy.mockResolvedValueOnce({
        referenceNumber: newReferenceNumber,
        status: 'DRAFT'
      })

      const response = await notificationCopyController.handler(request, h)

      expect(notificationClient.copy).toHaveBeenCalledWith(
        request,
        referenceNumber,
        'trace-abc'
      )
      expect(h.redirect).toHaveBeenCalledWith(
        `/notification-view/${newReferenceNumber}`
      )
      expect(response.statusCode).toBe(statusCodes.redirectFound)
      expect(response.location).toBe(`/notification-view/${newReferenceNumber}`)
    })
  })

  describe('When the copy fails', () => {
    test('Should redirect to the source notification view with an error flag', async () => {
      notificationClient.copy.mockRejectedValueOnce(new Error('Backend error'))

      const response = await notificationCopyController.handler(request, h)

      expect(h.redirect).toHaveBeenCalledWith(
        `/notification-view/${referenceNumber}?error=copy`
      )
      expect(response.location).toBe(
        `/notification-view/${referenceNumber}?error=copy`
      )
      expect(mockLoggerError).toHaveBeenCalledTimes(1)
    })
  })
})
