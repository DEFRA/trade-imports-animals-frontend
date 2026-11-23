import { onTestFinished, vi } from 'vitest'
import { Metrics } from '@defra/cdp-metrics'

import {
  countEventInBackground,
  publishMetricsInBackground
} from './publish-metrics.js'
import {
  EMF_TEST_NAMESPACE,
  recordEmfDocuments
} from '../../test-helpers/emf-documents.js'
import { recordEcsLogLines } from '../../test-helpers/ecs-log-lines.js'

describe('publish metrics', () => {
  const ecsLog = recordEcsLogLines()
  const emf = recordEmfDocuments()

  test('counting an event publishes a count of 1 with exactly the dimensions given', async () => {
    countEventInBackground('journey.validation.failure', { page: 'origin' })

    const document = await emf.onlyDocument()
    const directive = document._aws.CloudWatchMetrics[0]
    expect(directive).toEqual({
      Namespace: EMF_TEST_NAMESPACE,
      Dimensions: [['page']],
      Metrics: [{ Name: 'journey.validation.failure', Unit: 'Count' }]
    })
    expect(document.page).toBe('origin')
    expect(document['journey.validation.failure']).toBe(1)
  })

  test('counting an event with frozen dimensions publishes it', async () => {
    countEventInBackground(
      'external.dependency.error',
      Object.freeze({ dependency: 'redis' })
    )

    expect((await emf.onlyDocument()).dependency).toBe('redis')
  })

  test('counting an event with no dimensions publishes it under the empty dimension set', async () => {
    countEventInBackground('journey.started')

    const document = await emf.onlyDocument()
    expect(document._aws.CloudWatchMetrics[0].Dimensions).toEqual([[]])
    expect(document['journey.started']).toBe(1)
  })

  test('a document that cannot be written is logged at warn with the error, its dimensions and the metric names', async () => {
    const metricsLogger = {
      setNamespace: vi.fn(() => metricsLogger),
      putMetric: vi.fn(() => metricsLogger),
      flush: vi.fn().mockRejectedValue(new Error('agent unavailable'))
    }
    const getMetricsLogger = vi
      .spyOn(Metrics.prototype, 'getMetricsLogger')
      .mockReturnValue(metricsLogger)
    onTestFinished(() => getMetricsLogger.mockRestore())

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
