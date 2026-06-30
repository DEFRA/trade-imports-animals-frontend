import { BASE, LAYOUT, breadcrumbs } from '../../journey/config.js'
import { STATUS_QUOTED } from './helpers.js'

export const getConfirmation = (quote, request, h) => {
  if (quote.status !== STATUS_QUOTED) {
    return h.redirect(BASE)
  }
  return h.view('standalone/spike-a/templates/confirmation', {
    layout: LAYOUT,
    pageTitle: 'Quote confirmed',
    quote,
    reference: quote.reference,
    premium: quote.premium,
    breadcrumbs: breadcrumbs(quote, 'Quote confirmed')
  })
}
