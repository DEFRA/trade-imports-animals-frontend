import { updateQuote } from '../lib/store.js'
import { makeReference } from '../lib/quote.js'
import { BASE, LAYOUT, breadcrumbs } from '../journey.js'
import { withQuote } from './shared.js'

const STATUS_QUOTED = 'quoted'

export const confirmQuote = (quote) =>
  updateQuote(quote.id, {
    status: STATUS_QUOTED,
    reference: makeReference(quote.id)
  })

export const confirmationGet = withQuote((quote, request, responseToolkit) => {
  if (quote.status !== STATUS_QUOTED) {
    return responseToolkit.redirect(BASE)
  }
  return responseToolkit.view('standalone/spike-d/templates/confirmation', {
    layout: LAYOUT,
    pageTitle: 'Quote confirmed',
    quote,
    reference: quote.reference,
    premium: quote.premium,
    breadcrumbs: breadcrumbs(quote, 'Quote confirmed')
  })
})
