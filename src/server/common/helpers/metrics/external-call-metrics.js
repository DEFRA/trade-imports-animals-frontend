import { createLogger } from '../logging/logger.js'
import { countExternalCall } from '../call-counts/call-counts.js'
import {
  COUNT,
  MILLISECONDS,
  publishMetricsInBackground
} from './publish-metrics.js'
import { recordDependencyAvailability } from './dependency-availability.js'

const logger = createLogger()

/**
 * A call to a dependency, as the metric contract names it. `interfaceId`
 * names it in its log line only.
 *
 * @typedef {{ dependency: string, operation: string, interfaceId?: string }} ExternalCall
 */

const statusFields = (statusCode) =>
  statusCode === undefined
    ? {}
    : { http: { response: { status_code: statusCode } } }

const logExternalCall = (
  externalCall,
  { durationMs, failed, error, statusCode }
) => {
  const nanosecondsPerMillisecond = 1_000_000
  const action = `${externalCall.dependency}/${externalCall.operation}`
  const outcome = failed ? 'failure' : 'success'
  const fields = {
    event: {
      category: 'external-call',
      action,
      outcome,
      duration: Math.round(durationMs * nanosecondsPerMillisecond)
    },
    ...statusFields(statusCode),
    ...(error ? { err: error } : {})
  }
  const callName = externalCall.interfaceId
    ? `${action} (${externalCall.interfaceId})`
    : action
  const message = `External call ${callName} ${outcome} in ${Math.round(durationMs)} ms`
  if (failed) {
    logger.warn(fields, message)
  } else {
    logger.info(fields, message)
  }
}

/**
 * Records a finished call to a dependency: counts it against the request in
 * progress, logs one external-call line, publishes `external.call.duration`
 * and `external.call.failure` tagged `dependency` and `operation` without
 * making the caller wait for the publish, and keeps its outcome as the
 * dependency's availability, published every minute.
 *
 * @param {ExternalCall} externalCall - the call
 * @param {{ durationMs: number, failed: boolean, error?: Error, statusCode?: number }} result - how long it took, whether it failed, and the error or HTTP status it ended with
 */
export const recordExternalCallInBackground = (externalCall, result) => {
  countExternalCall(externalCall)
  logExternalCall(externalCall, result)
  recordDependencyAvailability({
    dependency: externalCall.dependency,
    available: !result.failed
  })
  publishMetricsInBackground(
    {
      dependency: externalCall.dependency,
      operation: externalCall.operation
    },
    [
      {
        name: 'external.call.duration',
        value: result.durationMs,
        unit: MILLISECONDS
      },
      {
        name: 'external.call.failure',
        value: result.failed ? 1 : 0,
        unit: COUNT
      }
    ]
  )
}

const outcomeOfStatus = (statusCode) => {
  const firstServerErrorStatus = 500
  return { failed: statusCode >= firstServerErrorStatus, statusCode }
}

const statusAnsweredWith = (error) =>
  error?.data?.isResponseError ? error.data.res.statusCode : error?.status

const outcomeOfThrown = (error) => {
  const statusCode = statusAnsweredWith(error)
  if (statusCode === undefined) {
    return { failed: true, error }
  }
  const outcome = outcomeOfStatus(statusCode)
  return outcome.failed ? { ...outcome, error } : outcome
}

const measure = async (externalCall, call, outcomeOf) => {
  const startedAt = performance.now()
  const recordSince = (outcome) =>
    recordExternalCallInBackground(externalCall, {
      durationMs: performance.now() - startedAt,
      ...outcome
    })
  let result
  try {
    result = await call()
  } catch (error) {
    recordSince(outcomeOfThrown(error))
    throw error
  }
  recordSince(outcomeOf(result))
  return result
}

/**
 * Runs a call to a dependency, records it, and returns its result. A call that
 * throws an error carrying the HTTP status the dependency answered with
 * (`error.status`, or a Wreck response error) is judged by that status as
 * {@link measureExternalResponse} judges a response, and logged with it; any
 * other throw is a failure. A thrown error is always rethrown.
 *
 * @template T
 * @param {ExternalCall} externalCall - the call
 * @param {() => Promise<T>} call - the call to run
 * @returns {Promise<T>} the call's result
 */
export const measureExternalCall = (externalCall, call) =>
  measure(externalCall, call, () => ({ failed: false }))

/**
 * Sends an HTTP request to a dependency, records it, and returns the response.
 * The call failed when sending throws or the response has a 5xx status; any
 * other status is the dependency answering, so it is a success.
 *
 * @param {ExternalCall} externalCall - the call
 * @param {() => Promise<Response>} send - sends the request
 * @returns {Promise<Response>} the dependency's response
 */
export const measureExternalResponse = (externalCall, send) =>
  measure(externalCall, send, (response) => outcomeOfStatus(response.status))
