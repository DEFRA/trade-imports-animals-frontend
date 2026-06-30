import { updateQuote } from '../../lib/store.js'
import { calculatePremium } from '../../lib/premium.js'
import { coverTypeLabel, extrasLabels } from '../../lib/quote.js'
import { BASE, LAYOUT, breadcrumbs } from '../../journey/config.js'
import { stepPath } from './helpers.js'

const priceQuote = (quote) => {
  const premium = calculatePremium(quote)
  return { premium, updated: updateQuote(quote.id, { premium }) }
}

const renderQuoteSummary = (quote, premium, h) =>
  h.view('standalone/spike-a/templates/quote-summary', {
    layout: LAYOUT,
    pageTitle: 'Your quote',
    quote,
    premium,
    coverLabel: coverTypeLabel(quote.coverType),
    extras: extrasLabels(quote.extras),
    backLink: `${BASE}/${quote.id}`,
    breadcrumbs: breadcrumbs(quote, 'Your quote')
  })

export const getQuoteSummary = (quote, request, h) => {
  const { premium, updated } = priceQuote(quote)
  return renderQuoteSummary(updated, premium, h)
}

export const submitQuoteSummary = (quote, request, h) =>
  h.redirect(stepPath(quote.id, 'check-your-answers'))
