import { findQuote } from '../lib/store.js'
import { contract } from '../runtime/contract/index.js'
import { BASE, grouped } from './config.js'

/**
 * URL/path building and nav resolution for the grouped journey. Loops and the
 * add-on fan-out own their own routes; everything else is a generic section page
 * at {base}/{id}/{stepId}. `resolveNav` turns a contract next/prev result into a
 * URL; `navBack`/`navNext` resolve it for a stored quote.
 */

const STEP_KIND_LOOP = 'loop'
const STEP_KIND_SUBTASKS = 'subtasks'
const TERMINAL_SUMMARY = 'summary'
const TERMINAL_HUB = 'hub'
const TERMINAL_START = 'start'
const SEGMENT_CLAIMS = 'claims'
const SEGMENT_ADDONS = 'addons'
const SEGMENT_QUOTE_SUMMARY = 'quote-summary'

export const hubPath = (id) => `${BASE}/${id}`
export const addonStepPath = (id, value, stepSlug) =>
  `${BASE}/${id}/addons/${value}/${stepSlug}`

export function breadcrumbs(quote, title) {
  return [
    { text: 'Prototypes', href: '/prototype-standalone' },
    { text: 'Spike C (standalone)', href: BASE },
    { text: 'Your application', href: hubPath(quote.id) },
    { text: title }
  ]
}

export function pathForStep(quote, stepId) {
  const kind = contract.stepKind(stepId)
  if (kind === STEP_KIND_LOOP) {
    return `${BASE}/${quote.id}/${SEGMENT_CLAIMS}`
  }
  if (kind === STEP_KIND_SUBTASKS) {
    return `${BASE}/${quote.id}/${SEGMENT_ADDONS}`
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
      return `${BASE}/${quote.id}/${SEGMENT_QUOTE_SUMMARY}`
    case TERMINAL_HUB:
      return hubPath(quote.id)
    case TERMINAL_START:
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
