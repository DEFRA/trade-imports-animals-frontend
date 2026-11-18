import { vi } from 'vitest'
import { Metrics } from '@defra/cdp-metrics'

import { countEvent, publishMetricsInBackground } from './publish-metrics.js'
import { config } from '../../../../config/config.js'
import { readEmfDocuments } from '../../test-helpers/emf-documents.js'
import { recordEcsLogLines } from '../../test-helpers/ecs-log-lines.js'

const NAMESPACE_KEY = 'metrics.namespace'
const TEST_NAMESPACE = 'test-namespace'

describe('publish metrics', () => {
  const originalNamespace = config.get(NAMESPACE_KEY)
  const ecsLog = recordEcsLogLines()
  let logSpy

  beforeEach(() => {
    config.set(NAMESPACE_KEY, TEST_NAMESPACE)
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    config.set(NAMESPACE_KEY, originalNamespace)
    vi.restoreAllMocks()
  })

  test('counting an event publishes a count of 1 with exactly the dimensions given', async () => {
    countEvent('journey.validation.failure', { page: 'origin' })

    await vi.waitFor(() => expect(readEmfDocuments(logSpy)).toHaveLength(1))
    const [document] = readEmfDocuments(logSpy)
    const directive = document._aws.CloudWatchMetrics[0]
    expect(directive).toEqual({
      Namespace: TEST_NAMESPACE,
      Dimensions: [['page']],
      Metrics: [{ Name: 'journey.validation.failure', Unit: 'Count' }]
    })
    expect(document.page).toBe('origin')
    expect(document['journey.validation.failure']).toBe(1)
  })

  test('counting an event with frozen dimensions publishes it', async () => {
    countEvent(
      'external.dependency.error',
      Object.freeze({ dependency: 'redis' })
    )

    await vi.waitFor(() => expect(readEmfDocuments(logSpy)).toHaveLength(1))
    expect(readEmfDocuments(logSpy)[0].dependency).toBe('redis')
  })

  test('counting an event with no dimensions publishes it under the empty dimension set', async () => {
    countEvent('journey.started')

    await vi.waitFor(() => expect(readEmfDocuments(logSpy)).toHaveLength(1))
    const [document] = readEmfDocuments(logSpy)
    expect(document._aws.CloudWatchMetrics[0].Dimensions).toEqual([[]])
    expect(document['journey.started']).toBe(1)
  })

  test('a document that cannot be written is logged at warn with the error, its dimensions and the metric names', async () => {
    const metricsLogger = {
      setNamespace: vi.fn(() => metricsLogger),
      putMetric: vi.fn(() => metricsLogger),
      flush: vi.fn().mockRejectedValue(new Error('agent unavailable'))
    }
    vi.spyOn(Metrics.prototype, 'getMetricsLogger').mockReturnValue(
      metricsLogger
    )

    publishMetricsInBackground(
      { dependency: 'address-book', operation: 'list-addresses' },
      [
        { name: 'external.call.duration', value: 2, unit: 'Milliseconds' },
        { name: 'external.call.failure', value: 0, unit: 'Count' }
      ]
    )

    await vi.waitFor(() => expect(ecsLog.lines()).toHaveLength(1))
    const [line] = ecsLog.lines()
    expect(line['log.level']).toBe('warn')
    expect(line.message).toBe('Could not publish metrics')
    expect(line.dimensions).toEqual({
      dependency: 'address-book',
      operation: 'list-addresses'
    })
    expect(line.metrics).toEqual([
      'external.call.duration',
      'external.call.failure'
    ])
    expect(line.error.message).toBe('agent unavailable')
  })
})
