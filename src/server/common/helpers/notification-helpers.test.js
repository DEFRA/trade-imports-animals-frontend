import { beforeEach, describe, expect, test, vi } from 'vitest'

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

  beforeEach(() => vi.clearAllMocks())

  test('calls notificationClient.get, logs, and returns notification object when referenceNumber is in session', async () => {
    const mockNotification = {
      referenceNumber: 'REF-123',
      origin: { countryCode: 'DE' }
    }
    getSessionValue.mockReturnValue('REF-123')
    notificationClient.get.mockResolvedValue(mockNotification)

    const result = await fetchNotification(request, logger)

    expect(notificationClient.get).toHaveBeenCalledWith(
      request,
      'REF-123',
      'trace-123'
    )
    expect(logger.info).toHaveBeenCalledWith(
      'Notification retrieved from notification client: REF-123'
    )
    expect(result).toBe(mockNotification)
  })

  test('does not call notificationClient.get and returns null when no referenceNumber in session', async () => {
    getSessionValue.mockReturnValue(null)

    const result = await fetchNotification(request, logger)

    expect(notificationClient.get).not.toHaveBeenCalled()
    expect(logger.info).not.toHaveBeenCalled()
    expect(result).toBeNull()
  })

  test('logs error and returns null when notificationClient.get rejects', async () => {
    getSessionValue.mockReturnValue('REF-123')
    notificationClient.get.mockRejectedValue(new Error('Backend down'))

    const result = await fetchNotification(request, logger)

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Backend down')
    )
    expect(result).toBeNull()
  })
})

describe('submitNotification', () => {
  const logger = { info: vi.fn(), error: vi.fn() }
  const request = {}

  beforeEach(() => vi.clearAllMocks())

  test('calls notificationClient.submit, logs info, and returns response on success', async () => {
    const mockResponse = { referenceNumber: 'REF-789' }
    notificationClient.submit.mockResolvedValue(mockResponse)

    const result = await submitNotification(request, logger)

    expect(notificationClient.submit).toHaveBeenCalledWith(request, 'trace-123')
    expect(logger.info).toHaveBeenCalledWith('Notification saved successfully')
    expect(result).toBe(mockResponse)
  })

  test('logs error and re-throws when notificationClient.submit rejects', async () => {
    const networkError = new Error('Network failure')
    notificationClient.submit.mockRejectedValue(networkError)

    await expect(submitNotification(request, logger)).rejects.toThrow(
      'Network failure'
    )

    expect(logger.error).toHaveBeenCalledWith(
      'Failed to submit notification: Network failure'
    )
  })
})
