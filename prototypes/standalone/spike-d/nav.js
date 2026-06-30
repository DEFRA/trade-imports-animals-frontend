import { findQuote } from './lib/store.js'
import { contract } from './runtime/index.js'
import { BASE, hubPath, grouped } from './journey-shape.js'

/**
 * Back/Next resolution over the journey shape. Loops and the add-on fan-out own
 * their own routes; everything else is a generic section page at
 * {base}/{id}/{stepId}.
 */

const STEP_KIND_LOOP = 'loop'
const STEP_KIND_SUBTASKS = 'subtasks'
const TERMINAL_SUMMARY = 'summary'
const TERMINAL_HUB = 'hub'

export function pathForStep(quote, stepId) {
  const kind = contract.stepKind(stepId)
  if (kind === STEP_KIND_LOOP) {
    return `${BASE}/${quote.id}/claims`
  }
  if (kind === STEP_KIND_SUBTASKS) {
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
    case TERMINAL_SUMMARY:
      return `${BASE}/${quote.id}/quote-summary`
    case TERMINAL_HUB:
      return hubPath(quote.id)
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
