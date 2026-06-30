import { findQuote } from '../lib/store.js'
import { contract } from '../runtime/selectors/index.js'
import { BASE, grouped, hubPath } from './config.js'

/**
 * Contract-driven navigation. The model's `contract` decides which step comes
 * next/prev; this layer turns those results (a step id, or a `{ terminal }`
 * marker) into the concrete URLs of this journey's route scheme.
 */

// Loops and the add-on fan-out own their own routes; everything else is a
// generic section page at {base}/{id}/{stepId}.
export function pathForStep(quote, stepId) {
  const kind = contract.stepKind(stepId)
  if (kind === 'loop') {
    return `${BASE}/${quote.id}/claims`
  }
  if (kind === 'subtasks') {
    return `${BASE}/${quote.id}/addons`
  }
  return `${BASE}/${quote.id}/${stepId}`
}

/** Turn a contract next/prev result (step id or { terminal }) into a URL. */
export function resolveNav(quote, result) {
  if (typeof result === 'string') {
    return pathForStep(quote, result)
  }
  switch (result.terminal) {
    case 'summary':
      return `${BASE}/${quote.id}/quote-summary`
    case 'hub':
      return hubPath(quote.id)
    case 'start':
    default:
      return BASE
  }
}

export const navBack = (id, stepId) => {
  const quote = findQuote(id)
  return resolveNav(quote, contract.prev(quote, stepId, grouped))
}

export const navNext = (id, stepId) => {
  const quote = findQuote(id)
  return resolveNav(quote, contract.next(quote, stepId, grouped))
}
