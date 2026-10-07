import { Metrics } from '@defra/cdp-metrics'

import { config } from '../../../../config/config.js'
import { createLogger } from '../logging/logger.js'

const logger = createLogger()

const BACKEND_CALLS_METRIC = 'BackendCalls'
const SESSION_RESOLUTIONS_METRIC = 'SessionResolutions'
const COUNT = 'Count'

/**
 * Emits one EMF document for a finished page request: its backend calls and session resolutions.
 *
 * @param {{ backendCalls: number, sessionResolutions: number }} counts - what the request made
 * @returns {Promise<void>}
 */
export const recordPageRequest = async ({
  backendCalls,
  sessionResolutions
}) => {
  try {
    const metricsLogger = new Metrics(logger).getMetricsLogger({
      RequestKind: 'page'
    })
    metricsLogger.setNamespace(config.get('metrics.namespace'))
    metricsLogger.putMetric(BACKEND_CALLS_METRIC, backendCalls, COUNT)
    metricsLogger.putMetric(
      SESSION_RESOLUTIONS_METRIC,
      sessionResolutions,
      COUNT
    )
    await metricsLogger.flush()
  } catch (error) {
    logger.warn({ err: error }, 'Could not record page request counts')
  }
}

/**
 * Emits the document without making the request wait for the flush.
 * Recording never rejects, so there is nothing for the caller to handle.
 *
 * @param {{ backendCalls: number, sessionResolutions: number }} counts - what the request made
 */
export const recordPageRequestInBackground = (counts) => {
  recordPageRequest(counts).catch(() => undefined)
}
