import { vi } from 'vitest'

import {
  saveNotification,
  submitNotification,
  deleteNotification
} from './notification-helpers.js'

const mockSave = vi.hoisted(() => vi.fn())
const mockSubmitNotification = vi.hoisted(() => vi.fn())
const mockSoftDelete = vi.hoisted(() => vi.fn())
const mockGetTraceId = vi.hoisted(() => vi.fn())

vi.mock('../clients/notification-client.js', () => ({
  notificationClient: {
    save: mockSave,
    submitNotification: mockSubmitNotification,
    softDelete: mockSoftDelete
  }
}))

vi.mock('@defra/hapi-tracing', () => ({
  getTraceId: mockGetTraceId
}))

describe('#saveNotification', () => {
  let mockLogger
  const mockRequest = { yar: {} }
  const traceId = 'trace-123'

  beforeEach(() => {
    vi.clearAllMocks()
    mockLogger = { info: vi.fn(), error: vi.fn() }
    mockGetTraceId.mockReturnValue(traceId)
  })

  describe('When save succeeds', () => {
    const mockResponse = { referenceNumber: 'REF-001' }

    beforeEach(() => {
      mockSave.mockResolvedValue(mockResponse)
    })

    test('Should call notificationClient.save with request and traceId', async () => {
      await saveNotification(mockRequest, mockLogger)

      expect(mockSave).toHaveBeenCalledWith(mockRequest, traceId)
    })

    test('Should log success message', async () => {
      await saveNotification(mockRequest, mockLogger)

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Notification saved successfully'
      )
    })

    test('Should return the response', async () => {
      const result = await saveNotification(mockRequest, mockLogger)

      expect(result).toEqual(mockResponse)
    })
  })

  describe('When save fails', () => {
    const error = new Error('network timeout')

    beforeEach(() => {
      mockSave.mockRejectedValue(error)
    })

    test('Should log error message with error details', async () => {
      await expect(saveNotification(mockRequest, mockLogger)).rejects.toThrow()

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to submit notification: network timeout'
      )
    })

    test('Should re-throw the error', async () => {
      await expect(saveNotification(mockRequest, mockLogger)).rejects.toThrow(
        'network timeout'
      )
    })
  })
})

describe('#submitNotification', () => {
  let mockLogger
  const mockRequest = { yar: {} }
  const traceId = 'trace-456'
  const referenceNumber = 'REF-002'

  beforeEach(() => {
    vi.clearAllMocks()
    mockLogger = { info: vi.fn(), error: vi.fn() }
    mockGetTraceId.mockReturnValue(traceId)
  })

  describe('When submit succeeds', () => {
    const mockResponse = { status: 'submitted' }

    beforeEach(() => {
      mockSubmitNotification.mockResolvedValue(mockResponse)
    })

    test('Should call notificationClient.submitNotification with correct args', async () => {
      await submitNotification(mockRequest, mockLogger, referenceNumber)

      expect(mockSubmitNotification).toHaveBeenCalledWith(
        mockRequest,
        referenceNumber,
        traceId
      )
    })

    test('Should log submitted message with reference number', async () => {
      await submitNotification(mockRequest, mockLogger, referenceNumber)

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Notification submitted: REF-002'
      )
    })

    test('Should return the response', async () => {
      const result = await submitNotification(
        mockRequest,
        mockLogger,
        referenceNumber
      )

      expect(result).toEqual(mockResponse)
    })
  })

  describe('When submit fails', () => {
    const error = new Error('server error')

    beforeEach(() => {
      mockSubmitNotification.mockRejectedValue(error)
    })

    test('Should log error message', async () => {
      await expect(
        submitNotification(mockRequest, mockLogger, referenceNumber)
      ).rejects.toThrow()

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to submit notification: server error'
      )
    })

    test('Should re-throw the error', async () => {
      await expect(
        submitNotification(mockRequest, mockLogger, referenceNumber)
      ).rejects.toThrow('server error')
    })
  })
})

describe('#deleteNotification', () => {
  let mockLogger
  const mockRequest = { yar: {} }
  const traceId = 'trace-789'
  const referenceNumber = 'REF-003'

  beforeEach(() => {
    vi.clearAllMocks()
    mockLogger = { info: vi.fn(), error: vi.fn() }
    mockGetTraceId.mockReturnValue(traceId)
  })

  describe('When soft delete succeeds', () => {
    const mockResponse = { status: 'DELETED' }

    beforeEach(() => {
      mockSoftDelete.mockResolvedValue(mockResponse)
    })

    test('Should call notificationClient.softDelete with correct args', async () => {
      await deleteNotification(mockRequest, mockLogger, referenceNumber)

      expect(mockSoftDelete).toHaveBeenCalledWith(
        mockRequest,
        referenceNumber,
        traceId
      )
    })

    test('Should log the soft-deleted reference number', async () => {
      await deleteNotification(mockRequest, mockLogger, referenceNumber)

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Notification soft-deleted: REF-003'
      )
    })

    test('Should return the response', async () => {
      const result = await deleteNotification(
        mockRequest,
        mockLogger,
        referenceNumber
      )

      expect(result).toEqual(mockResponse)
    })
  })

  describe('When soft delete fails', () => {
    const error = new Error('delete error')

    beforeEach(() => {
      mockSoftDelete.mockRejectedValue(error)
    })

    test('Should log error message', async () => {
      await expect(
        deleteNotification(mockRequest, mockLogger, referenceNumber)
      ).rejects.toThrow()

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to delete notification: delete error'
      )
    })

    test('Should re-throw the error', async () => {
      await expect(
        deleteNotification(mockRequest, mockLogger, referenceNumber)
      ).rejects.toThrow('delete error')
    })
  })
})
