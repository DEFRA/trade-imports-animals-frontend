import { Metrics } from '@defra/cdp-metrics'

import { config } from '../../../config/config.js'
import { createLogger } from './logging/logger.js'
import { countExternalCall } from './call-counts/call-counts.js'

const logger = createLogger()

const DURATION_METRIC = 'ExternalCallDuration'
const FAILURE_METRIC = 'ExternalCallFailure'
const MILLISECONDS = 'Milliseconds'
const COUNT = 'Count'
const SUCCESS = 'success'
const FAILURE = 'failure'

/**
 * Emits one EMF document for a finished call to a system outside the INS boundary.
 *
 * @param {{ dependency: string, operation: string, interfaceId?: string }} externalCall - the call, as the metric contract names it
 * @param {{ durationMs: number, failed: boolean }} result - how long it took and whether it failed
 * @returns {Promise<void>}
 */
export const recordExternalCall = async (
  { dependency, operation, interfaceId },
  { durationMs, failed }
) => {
  try {
    const metricsLogger = new Metrics(logger).getMetricsLogger({
      Dependency: dependency,
      Operation: operation
    })
    metricsLogger.setNamespace(config.get('metrics.namespace'))
    metricsLogger.putMetric(DURATION_METRIC, durationMs, MILLISECONDS)
    metricsLogger.putMetric(FAILURE_METRIC, failed ? 1 : 0, COUNT)
    metricsLogger.setProperty('Outcome', failed ? FAILURE : SUCCESS)
    if (interfaceId !== undefined) {
      metricsLogger.setProperty('Interface', interfaceId)
    }
    await metricsLogger.flush()
  } catch (error) {
    logger.warn(
      { err: error, dependency, operation },
      'Could not record external call'
    )
  }
}

/**
 * Emits the document for a finished call without making the caller wait for the flush.
 * Recording never rejects, so there is nothing for the caller to handle.
 *
 * @param {{ dependency: string, operation: string, interfaceId?: string }} externalCall - the call, as the metric contract names it
 * @param {{ durationMs: number, failed: boolean }} result - how long it took and whether it failed
 */
export const recordExternalCallInBackground = (externalCall, result) => {
  countExternalCall(externalCall)
  recordExternalCall(externalCall, result).catch(() => undefined)
}

const recordSince = (externalCall, startedAt, failed) =>
  recordExternalCallInBackground(externalCall, {
    durationMs: performance.now() - startedAt,
    failed
  })

/**
 * Runs a call to a system outside the INS boundary, records it, and returns its result.
 *
 * @template T
 * @param {{ dependency: string, operation: string, interfaceId?: string }} externalCall - the call, as the metric contract names it
 * @param {() => Promise<T>} call - the call to run
 * @returns {Promise<T>} the call's result
 */
export const measureExternalCall = async (externalCall, call) => {
  const startedAt = performance.now()
  try {
    const result = await call()
    recordSince(externalCall, startedAt, false)
    return result
  } catch (error) {
    recordSince(externalCall, startedAt, true)
    throw error
  }
}
