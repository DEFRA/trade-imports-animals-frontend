import { afterEach, beforeEach, expect, vi } from 'vitest'

import { config } from '../../../config/config.js'
import { countEvent } from '../helpers/metrics/publish-metrics.js'
import { restoreConfigAfterEach } from './restore-config-after-each.js'

export const EMF_TEST_NAMESPACE = 'test-namespace'

const NAMESPACE_KEY = 'metrics.namespace'
const EXTERNAL_CALL_FAILURE = 'external.call.failure'
const FLUSH_MARKER = 'test.flush.marker'

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
 * `describe`, under the namespace `EMF_TEST_NAMESPACE`, and keeps them off the
 * test output. Restores console.log and the namespace afterwards.
 *
 * @returns {{
 *   documents: () => object[],
 *   documentsWith: (metricName: string) => object[],
 *   valuesOf: (metricName: string) => number[],
 *   publishesOf: (metricName: string) => Array<{ value: number, unit: string, dimensions: Record<string, string> }>,
 *   onlyDocument: () => Promise<object>,
 *   onlyExternalCall: () => Promise<{ dependency: string, operation: string, failure: number }>,
 *   earlierPublishesFlushed: () => Promise<void>
 * }} readers of the documents captured so far, each in the order published
 */
export const recordEmfDocuments = () => {
  restoreConfigAfterEach([NAMESPACE_KEY])
  let logSpy

  beforeEach(() => {
    config.set(NAMESPACE_KEY, EMF_TEST_NAMESPACE)
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    logSpy.mockRestore()
  })

  const documents = () => readEmfDocuments(logSpy)

  const documentsWith = (metricName) =>
    documents().filter((document) => metricName in document)

  const valuesOf = (metricName) =>
    documentsWith(metricName).map((document) => document[metricName])

  const publishesOf = (metricName) =>
    documentsWith(metricName).map((document) => publishOf(document, metricName))

  const onlyDocument = async () => {
    await vi.waitFor(() => expect(documents()).toHaveLength(1))
    return documents()[0]
  }

  const onlyExternalCall = async () => {
    await vi.waitFor(() =>
      expect(documentsWith(EXTERNAL_CALL_FAILURE)).toHaveLength(1)
    )
    const [document] = documentsWith(EXTERNAL_CALL_FAILURE)
    return {
      dependency: document.dependency,
      operation: document.operation,
      failure: document[EXTERNAL_CALL_FAILURE]
    }
  }

  const earlierPublishesFlushed = async () => {
    countEvent(FLUSH_MARKER)
    await vi.waitFor(() => expect(valuesOf(FLUSH_MARKER)).toEqual([1]))
  }

  return {
    documents,
    documentsWith,
    valuesOf,
    publishesOf,
    onlyDocument,
    onlyExternalCall,
    earlierPublishesFlushed
  }
}
