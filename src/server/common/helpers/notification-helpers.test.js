import { vi } from 'vitest'

import {
  saveNotification,
  submitNotification,
  deleteNotification,
  amendNotification,
  cancelAmendNotification
} from './notification-helpers.js'

const mockSave = vi.hoisted(() => vi.fn())
const mockSubmitNotification = vi.hoisted(() => vi.fn())
const mockSoftDelete = vi.hoisted(() => vi.fn())
const mockAmend = vi.hoisted(() => vi.fn())
const mockCancelAmend = vi.hoisted(() => vi.fn())
const mockGetTraceId = vi.hoisted(() => vi.fn())

vi.mock('../clients/notification-client.js', () => ({
  notificationClient: {
    save: mockSave,
    submitNotification: mockSubmitNotification,
    softDelete: mockSoftDelete,
    amend: mockAmend,
    cancelAmend: mockCancelAmend
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

describe('#amendNotification', () => {
  let mockLogger
  const mockRequest = { yar: {} }
  const traceId = 'trace-amd'
  const referenceNumber = 'REF-AMD-1'

  beforeEach(() => {
    vi.clearAllMocks()
    mockLogger = { info: vi.fn(), error: vi.fn() }
    mockGetTraceId.mockReturnValue(traceId)
  })

  describe('When amend succeeds', () => {
    const mockResponse = { status: 'AMEND' }

    beforeEach(() => {
      mockAmend.mockResolvedValue(mockResponse)
    })

    test('Should call notificationClient.amend with correct args', async () => {
      await amendNotification(mockRequest, mockLogger, referenceNumber)

      expect(mockAmend).toHaveBeenCalledWith(
        mockRequest,
        referenceNumber,
        traceId
      )
    })

    test('Should log the amended reference number', async () => {
      await amendNotification(mockRequest, mockLogger, referenceNumber)

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Notification moved to amend: REF-AMD-1'
      )
    })

    test('Should return the response', async () => {
      const result = await amendNotification(
        mockRequest,
        mockLogger,
        referenceNumber
      )

      expect(result).toEqual(mockResponse)
    })
  })

  describe('When amend fails', () => {
    const error = new Error('amend error')

    beforeEach(() => {
      mockAmend.mockRejectedValue(error)
    })

    test('Should log error message', async () => {
      await expect(
        amendNotification(mockRequest, mockLogger, referenceNumber)
      ).rejects.toThrow()

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to amend notification: amend error'
      )
    })

    test('Should re-throw the error', async () => {
      await expect(
        amendNotification(mockRequest, mockLogger, referenceNumber)
      ).rejects.toThrow('amend error')
    })
  })
})

describe('#cancelAmendNotification', () => {
  let mockLogger
  const mockRequest = { yar: {} }
  const traceId = 'trace-can'
  const referenceNumber = 'REF-CAN-1'

  beforeEach(() => {
    vi.clearAllMocks()
    mockLogger = { info: vi.fn(), error: vi.fn() }
    mockGetTraceId.mockReturnValue(traceId)
  })

  describe('When cancel amend succeeds', () => {
    const mockResponse = { status: 'SUBMITTED' }

    beforeEach(() => {
      mockCancelAmend.mockResolvedValue(mockResponse)
    })

    test('Should call notificationClient.cancelAmend with correct args', async () => {
      await cancelAmendNotification(mockRequest, mockLogger, referenceNumber)

      expect(mockCancelAmend).toHaveBeenCalledWith(
        mockRequest,
        referenceNumber,
        traceId
      )
    })

    test('Should log the cancelled reference number', async () => {
      await cancelAmendNotification(mockRequest, mockLogger, referenceNumber)

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Amendment cancelled for notification: REF-CAN-1'
      )
    })

    test('Should return the response', async () => {
      const result = await cancelAmendNotification(
        mockRequest,
        mockLogger,
        referenceNumber
      )

      expect(result).toEqual(mockResponse)
    })

    test('Should use empty trace id when getTraceId returns null', async () => {
      mockGetTraceId.mockReturnValueOnce(null)

      await cancelAmendNotification(mockRequest, mockLogger, referenceNumber)

      expect(mockCancelAmend).toHaveBeenCalledWith(
        mockRequest,
        referenceNumber,
        ''
      )
    })
  })

  describe('When cancel amend fails', () => {
    const error = new Error('cancel error')

    beforeEach(() => {
      mockCancelAmend.mockRejectedValue(error)
    })

    test('Should log error message and re-throw', async () => {
      await expect(
        cancelAmendNotification(mockRequest, mockLogger, referenceNumber)
      ).rejects.toThrow('cancel error')

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to cancel amendment: cancel error'
      )
    })
  })
})
