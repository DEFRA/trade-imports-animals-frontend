import { AsyncLocalStorage } from 'node:async_hooks'

import { addPageRequest, isPageRequest } from './call-count-totals.js'

const PLUGIN_NAME = 'call-counts'

const storage = new AsyncLocalStorage()

/**
 * Starts the counts for one request.
 *
 * @returns {{ sessionResolutions: number, externalCalls: Record<string, Record<string, number>> }} zeroed counts
 */
export const newCallCounts = () => ({
  sessionResolutions: 0,
  externalCalls: {}
})

/**
 * Finds the counts a request is accumulating.
 *
 * @param {import('@hapi/hapi').Request} request - the request
 * @returns {ReturnType<typeof newCallCounts> | undefined} the counts, or undefined when the plugin did not see the request
 */
export const callCountsOf = (request) => request?.plugins?.[PLUGIN_NAME]

/**
 * Counts one call to a dependency against the request in progress, by
 * dependency and operation.
 *
 * @param {{ dependency: string, operation: string }} externalCall - the call, as the metric contract names it
 */
export const countExternalCall = ({ dependency, operation }) => {
  const counts = storage.getStore()
  if (!counts) {
    return
  }
  const operations = counts.externalCalls[dependency] ?? {}
  counts.externalCalls[dependency] = {
    ...operations,
    [operation]: (operations[operation] ?? 0) + 1
  }
}

/**
 * Counts one read of the signed-in session record against the given request.
 *
 * @param {import('@hapi/hapi').Request} request - the request the session is read for
 */
export const countSessionResolution = (request) => {
  const counts = callCountsOf(request)
  if (counts) {
    counts.sessionResolutions += 1
  }
}

const bindCountsToCycle = (request, cycle, counts) => {
  const requestCycle = request[cycle].bind(request)
  request[cycle] = () => storage.run(counts, requestCycle)
}

const countRequest = (request, h) => {
  const counts = newCallCounts()
  request.plugins[PLUGIN_NAME] = counts
  bindCountsToCycle(request, '_lifecycle', counts)
  bindCountsToCycle(request, '_postCycle', counts)
  return h.continue
}

const totalFinishedRequest = (request) => {
  const counts = callCountsOf(request)
  if (!counts || !isPageRequest(request.route.path)) {
    return
  }
  addPageRequest({
    method: request.method,
    path: request.route.path,
    counts
  })
}

export const callCounts = {
  plugin: {
    name: PLUGIN_NAME,
    register(server) {
      server.ext('onRequest', countRequest)
      server.events.on('response', totalFinishedRequest)
    }
  }
}
