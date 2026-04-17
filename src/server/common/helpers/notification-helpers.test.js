import { describe, expect, test, vi } from 'vitest'

import {
  fetchNotification,
  submitNotification
} from './notification-helpers.js'

import { notificationClient } from '../clients/notification-client.js'
import { getSessionValue } from './session-helpers.js'

vi.mock('@defra/hapi-tracing', () => ({
  getTraceId: vi.fn(() => 'trace-123')
}))

vi.mock('../clients/notification-client.js', () => ({
  notificationClient: {
    get: vi.fn(),
    submit: vi.fn()
  }
}))

vi.mock('./session-helpers.js', () => ({
  getSessionValue: vi.fn()
}))

describe('fetchNotification', () => {
  const logger = { info: vi.fn(), error: vi.fn() }
  const request = {}

  test('calls notificationClient.get, logs, and returns referenceNumber when referenceNumber is in session', () => {
    getSessionValue.mockReturnValue('REF-123')

    const result = fetchNotification(request, logger)

    expect(notificationClient.get).toHaveBeenCalledWith(
      request,
      'REF-123',
      'trace-123'
    )
    expect(logger.info).toHaveBeenCalledWith(
      'Notification retrieved from notification client: REF-123'
    )
    expect(result).toBe('REF-123')
  })

  test('does not call notificationClient.get and returns null/undefined when no referenceNumber in session', () => {
    getSessionValue.mockReturnValue(null)
    notificationClient.get.mockClear()
    logger.info.mockClear()

    const result = fetchNotification(request, logger)

    expect(notificationClient.get).not.toHaveBeenCalled()
    expect(logger.info).not.toHaveBeenCalled()
    expect(result).toBeNull()
  })
})

describe('submitNotification', () => {
  const logger = { info: vi.fn(), error: vi.fn() }
  const request = {}
  const traceId = 'trace-456'

  test('calls notificationClient.submit, logs info, and returns response on success', async () => {
    const mockResponse = { referenceNumber: 'REF-789' }
    notificationClient.submit.mockResolvedValue(mockResponse)

    const result = await submitNotification(request, traceId, logger)

    expect(notificationClient.submit).toHaveBeenCalledWith(request, traceId)
    expect(logger.info).toHaveBeenCalledWith('Notification saved successfully')
    expect(result).toBe(mockResponse)
  })

  test('logs error and returns undefined when notificationClient.submit rejects', async () => {
    notificationClient.submit.mockRejectedValue(new Error('Network failure'))
    logger.error.mockClear()

    const result = await submitNotification(request, traceId, logger)

    expect(logger.error).toHaveBeenCalledWith(
      'Failed to submit notification: Network failure'
    )
    expect(result).toBeUndefined()
  })
})
