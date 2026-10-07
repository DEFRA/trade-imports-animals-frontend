import { vi } from 'vitest'
import { Metrics } from '@defra/cdp-metrics'

import {
  recordPageRequest,
  recordPageRequestInBackground
} from './page-request-metrics.js'
import { config } from '../../../../config/config.js'
import { readEmfDocuments } from '../../test-helpers/emf-documents.js'

const loggerWarnMock = vi.hoisted(() => vi.fn())

vi.mock('../logging/logger.js', () => ({
  createLogger: () => ({
    warn: loggerWarnMock,
    info: vi.fn(),
    error: vi.fn()
  })
}))

const NAMESPACE_KEY = 'metrics.namespace'
const TEST_NAMESPACE = 'test-namespace'

describe('page request metrics', () => {
  const originalNamespace = config.get(NAMESPACE_KEY)
  let logSpy

  beforeEach(() => {
    config.set(NAMESPACE_KEY, TEST_NAMESPACE)
    loggerWarnMock.mockReset()
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    config.set(NAMESPACE_KEY, originalNamespace)
    vi.restoreAllMocks()
  })

  test('emits one document with the page request dimension and both counts', async () => {
    await recordPageRequest({ backendCalls: 3, sessionResolutions: 2 })

    const documents = readEmfDocuments(logSpy)
    expect(documents).toHaveLength(1)
    const [document] = documents
    const directive = document._aws.CloudWatchMetrics[0]
    expect(directive.Namespace).toBe(TEST_NAMESPACE)
    expect(directive.Dimensions).toEqual([['RequestKind']])
    expect(directive.Metrics).toEqual([
      expect.objectContaining({ Name: 'BackendCalls', Unit: 'Count' }),
      expect.objectContaining({ Name: 'SessionResolutions', Unit: 'Count' })
    ])
    expect(document.RequestKind).toBe('page')
    expect(document.BackendCalls).toBe(3)
    expect(document.SessionResolutions).toBe(2)
  })

  test('recording in the background emits the same document', async () => {
    recordPageRequestInBackground({ backendCalls: 1, sessionResolutions: 1 })

    await vi.waitFor(() => expect(readEmfDocuments(logSpy)).toHaveLength(1))

    const [document] = readEmfDocuments(logSpy)
    const directive = document._aws.CloudWatchMetrics[0]
    expect(directive.Namespace).toBe(TEST_NAMESPACE)
    expect(directive.Dimensions).toEqual([['RequestKind']])
    expect(document.RequestKind).toBe('page')
    expect(document.BackendCalls).toBe(1)
    expect(document.SessionResolutions).toBe(1)
  })

  test('resolves and logs a warning when the flush rejects', async () => {
    const metricsLogger = {
      setNamespace: vi.fn(() => metricsLogger),
      putMetric: vi.fn(() => metricsLogger),
      flush: vi.fn().mockRejectedValue(new Error('agent unavailable'))
    }
    vi.spyOn(Metrics.prototype, 'getMetricsLogger').mockReturnValue(
      metricsLogger
    )

    await expect(
      recordPageRequest({ backendCalls: 1, sessionResolutions: 1 })
    ).resolves.toBeUndefined()

    expect(loggerWarnMock).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(Error) }),
      'Could not record page request counts'
    )
  })
})
