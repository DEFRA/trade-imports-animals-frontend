import { updateQuote } from '../lib/store.js'
import { calculatePremium } from '../lib/premium.js'
import { coverTypeLabel, extrasLabels } from '../lib/quote.js'
import { BASE, LAYOUT, breadcrumbs } from '../journey.js'
import { at, withQuote } from './shared.js'

// Computing the premium persists it back to the store (a write during the GET).
const priceQuote = (quote) =>
  updateQuote(quote.id, { premium: calculatePremium(quote) })

const renderQuoteSummary = (quote, responseToolkit) =>
  responseToolkit.view('standalone/spike-d/templates/quote-summary', {
    layout: LAYOUT,
    pageTitle: 'Your quote',
    quote,
    premium: quote.premium,
    coverLabel: coverTypeLabel(quote.coverType),
    extras: extrasLabels(quote.extras),
    backLink: `${BASE}/${quote.id}`,
    breadcrumbs: breadcrumbs(quote, 'Your quote')
  })

export const quoteSummaryGet = withQuote((quote, request, responseToolkit) =>
  renderQuoteSummary(priceQuote(quote), responseToolkit)
)

export const quoteSummaryPost = withQuote((quote, request, responseToolkit) =>
  responseToolkit.redirect(at(quote.id, 'check-your-answers'))
)
