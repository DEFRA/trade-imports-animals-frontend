import { findQuote } from '../lib/store.js'
import { BASE } from '../journey.js'

export const open = { auth: false }

export const at = (id, slug) => `${BASE}/${id}/${slug}`

// Resolve the quote once and short-circuit to BASE when it is missing.
export const withQuote = (handler) => (request, responseToolkit) => {
  const quote = findQuote(request.params.id)
  if (!quote) {
    return responseToolkit.redirect(BASE)
  }
  return handler(quote, request, responseToolkit)
}
