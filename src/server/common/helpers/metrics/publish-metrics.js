import { Metrics } from '@defra/cdp-metrics'

import { config } from '../../../../config/config.js'
import { createLogger } from '../logging/logger.js'

const logger = createLogger()

export const MILLISECONDS = 'Milliseconds'
export const COUNT = 'Count'
export const NONE = 'None'

const publishMetrics = async (dimensions, metrics) => {
  const metricsLogger = new Metrics(logger).getMetricsLogger({ ...dimensions })
  metricsLogger.setNamespace(config.get('metrics.namespace'))
  for (const { name, value, unit } of metrics) {
    metricsLogger.putMetric(name, value, unit)
  }
  await metricsLogger.flush()
}

/**
 * Writes one EMF document holding the given metrics, all with the same
 * dimensions, without making the caller wait for the flush. A document that
 * cannot be written is logged at warn with its dimensions and metric names.
 *
 * @param {Record<string, string>} dimensions - the dimensions every metric is published with
 * @param {Array<{ name: string, value: number, unit: string }>} metrics - the metrics, by their dot-case names
 */
export const publishMetricsInBackground = (dimensions, metrics) => {
  publishMetrics(dimensions, metrics).catch((error) => {
    logger.warn(
      { err: error, dimensions, metrics: metrics.map(({ name }) => name) },
      'Could not publish metrics'
    )
  })
}

/**
 * Publishes a count of one for an event, without making the caller wait for
 * the flush.
 *
 * @param {string} name - the metric's dot-case name
 * @param {Record<string, string>} [dimensions] - its dimensions, the same set on every publish
 */
export const countEventInBackground = (name, dimensions = {}) =>
  publishMetricsInBackground(dimensions, [{ name, value: 1, unit: COUNT }])
