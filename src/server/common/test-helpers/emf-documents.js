import { afterEach, beforeEach, expect, vi } from 'vitest'

import { config } from '../../../config/config.js'
import { countEventInBackground } from '../helpers/metrics/publish-metrics.js'
import { restoreConfigAfterEach } from './restore-config-after-each.js'

export const EMF_TEST_NAMESPACE = 'test-namespace'
export const DEPENDENCY_AVAILABLE = 'external.dependency.available'

/**
 * Builds the `external.dependency.available` publish a dependency's
 * availability makes.
 *
 * @param {string} dependency - the dependency it is tagged with
 * @param {number} value - 1 when available, 0 when not
 * @returns {{ value: number, unit: string, dimensions: { dependency: string } }} the publish
 */
export const availabilityPublish = (dependency, value) => ({
  value,
  unit: 'None',
  dimensions: { dependency }
})

const firstArgument = ([line]) => line
const isJsonLine = (line) => typeof line === 'string' && line.startsWith('{')
const isEmfDocument = (document) => Boolean(document._aws)

const readEmfDocuments = (logSpy) =>
  logSpy.mock.calls
    .map(firstArgument)
    .filter(isJsonLine)
    .map((line) => JSON.parse(line))
    .filter(isEmfDocument)

const publishOf = (document, metricName) => {
  const [directive] = document._aws.CloudWatchMetrics
  const { Unit } = directive.Metrics.find(({ Name }) => Name === metricName)
  const dimensionNames = directive.Dimensions.flat()
  return {
    value: document[metricName],
    unit: Unit,
    dimensions: Object.fromEntries(
      dimensionNames.map((name) => [name, document[name]])
    )
  }
}

/**
 * Captures the EMF documents published during each test of the enclosing
 * `describe`, under the namespace `EMF_TEST_NAMESPACE`, and silences every
 * console.log call during each test. Restores console.log and the namespace
 * afterwards.
 *
 * @returns {{
 *   documents: () => object[],
 *   documentsWith: (metricName: string) => object[],
 *   valuesOf: (metricName: string) => number[],
 *   publishesOf: (metricName: string) => Array<{ value: number, unit: string, dimensions: Record<string, string> }>,
 *   availabilityOf: (dependency: string) => Array<{ value: number, unit: string, dimensions: Record<string, string> }>,
 *   onlyDocument: () => Promise<object>,
 *   externalCalls: () => Array<{ dependency: string, operation: string, failure: number }>,
 *   onlyExternalCall: () => Promise<{ dependency: string, operation: string, failure: number }>,
 *   publishMarkerAndAwaitEarlierPublishes: () => Promise<void>
 * }} readers of the documents captured so far, each in the order published
 */
export const recordEmfDocuments = () => {
  const NAMESPACE_KEY = 'metrics.namespace'
  const EXTERNAL_CALL_FAILURE = 'external.call.failure'
  const FLUSH_MARKER = 'test.flush.marker'

  restoreConfigAfterEach([NAMESPACE_KEY])
  let logSpy

  beforeEach(() => {
    config.set(NAMESPACE_KEY, EMF_TEST_NAMESPACE)
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    logSpy.mockRestore()
  })

  const isFlushMarker = (document) => FLUSH_MARKER in document

  const documents = () =>
    readEmfDocuments(logSpy).filter((document) => !isFlushMarker(document))

  const flushMarkerCount = () =>
    readEmfDocuments(logSpy).filter(isFlushMarker).length

  const documentsWith = (metricName) =>
    documents().filter((document) => metricName in document)

  const valuesOf = (metricName) =>
    documentsWith(metricName).map((document) => document[metricName])

  const publishesOf = (metricName) =>
    documentsWith(metricName).map((document) => publishOf(document, metricName))

  const availabilityOf = (dependency) =>
    publishesOf(DEPENDENCY_AVAILABLE).filter(
      ({ dimensions }) => dimensions.dependency === dependency
    )

  const onlyDocument = async () => {
    await vi.waitFor(() => expect(documents()).toHaveLength(1))
    return documents()[0]
  }

  const externalCalls = () =>
    documentsWith(EXTERNAL_CALL_FAILURE).map((document) => ({
      dependency: document.dependency,
      operation: document.operation,
      failure: document[EXTERNAL_CALL_FAILURE]
    }))

  const onlyExternalCall = async () => {
    await vi.waitFor(() => expect(externalCalls()).toHaveLength(1))
    return externalCalls()[0]
  }

  const publishMarkerAndAwaitEarlierPublishes = async () => {
    const markersBefore = flushMarkerCount()
    countEventInBackground(FLUSH_MARKER)
    await vi.waitFor(() => expect(flushMarkerCount()).toBe(markersBefore + 1))
  }

  return {
    documents,
    documentsWith,
    valuesOf,
    publishesOf,
    availabilityOf,
    onlyDocument,
    externalCalls,
    onlyExternalCall,
    publishMarkerAndAwaitEarlierPublishes
  }
}
