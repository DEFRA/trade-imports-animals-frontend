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
      })),
      response: vi.fn(() => ({ code: vi.fn().mockReturnThis() }))
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

  describe('When the copy fails with a 404', () => {
    test('Should return 404', async () => {
      const err = new Error('Not found')
      err.status = statusCodes.notFound
      notificationClient.copy.mockRejectedValueOnce(err)

      const codeStub = vi.fn().mockReturnThis()
      h.response.mockReturnValue({ code: codeStub })

      await notificationCopyController.handler(request, h)

      expect(h.response).toHaveBeenCalledWith({
        error: 'Failed to copy notification'
      })
      expect(codeStub).toHaveBeenCalledWith(statusCodes.notFound)
      expect(mockLoggerError).toHaveBeenCalledTimes(1)
    })
  })

  describe('When the copy fails with a 500', () => {
    test('Should return 500', async () => {
      const err = new Error('Backend error')
      err.status = statusCodes.internalServerError
      notificationClient.copy.mockRejectedValueOnce(err)

      const codeStub = vi.fn().mockReturnThis()
      h.response.mockReturnValue({ code: codeStub })

      await notificationCopyController.handler(request, h)

      expect(h.response).toHaveBeenCalledWith({
        error: 'Failed to copy notification'
      })
      expect(codeStub).toHaveBeenCalledWith(statusCodes.internalServerError)
      expect(mockLoggerError).toHaveBeenCalledTimes(1)
    })
  })
})
