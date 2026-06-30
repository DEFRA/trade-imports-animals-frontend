import { hasOwnRoutes } from '../lib/sections/index.js'
import { contract } from '../runtime/contract/index.js'
import { BASE } from '../journey/index.js'

/** URL builders for the closing pages and their per-row "Change" links. */

const CHANGE_QUERY = '?change=1'

export const stepPath = (id, slug) => `${BASE}/${id}/${slug}`

// Simple question pages round-trip via ?change=1; loops / fan-outs link to their
// own first page and return through their own flow.
export const changeHref = (quote, stepId) => {
  const stepUrl = stepPath(quote.id, stepId)
  return contract.stepKind(stepId) ? stepUrl : `${stepUrl}${CHANGE_QUERY}`
}

export const rowHref = (quote, section, stepId) =>
  hasOwnRoutes(section) ? stepPath(quote.id, stepId) : changeHref(quote, stepId)
