import { findQuote } from '../../lib/store.js'
import { contract } from '../../runtime/selectors/index.js'
import { BASE } from '../../journey/config.js'

export const STATUS_QUOTED = 'quoted'

export const open = { auth: false }
export const stepPath = (id, slug) => `${BASE}/${id}/${slug}`

// Load the quote once and short-circuit to BASE when it is missing, so each
// handler receives a resolved quote and never repeats the guard.
export const withQuote = (handler) => (request, h) => {
  const quote = findQuote(request.params.id)
  return quote ? handler(quote, request, h) : h.redirect(BASE)
}

// Simple question pages round-trip via ?change=1; loops / fan-outs link to their
// own first page and return through their own flow.
export const changeHref = (quote, stepId) => {
  const basePath = stepPath(quote.id, stepId)
  return contract.stepKind(stepId) ? basePath : `${basePath}?change=1`
}
