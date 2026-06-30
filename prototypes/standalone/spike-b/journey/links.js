import { findQuote } from '../lib/store.js'
import { contract } from '../runtime/contract.js'
import { BASE, grouped } from './config.js'

/**
 * URL/link construction and nav resolution — turns a contract next/prev result
 * (a step id or a `{ terminal }`) into a concrete URL for this journey's groups.
 * This is "what URL the machine's decision maps to", separate from the machine
 * navigation itself (runtime/navigation.js).
 */

export const hubPath = (id) => `${BASE}/${id}`
export const addonStepPath = (id, value, stepSlug) =>
  `${BASE}/${id}/addons/${value}/${stepSlug}`

export function breadcrumbs(quote, title) {
  return [
    { text: 'Prototypes', href: '/prototype-standalone' },
    { text: 'Spike B (standalone)', href: BASE },
    { text: 'Your application', href: hubPath(quote.id) },
    { text: title }
  ]
}

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
