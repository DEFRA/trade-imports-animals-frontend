import { findQuote, updateQuote } from '../lib/store.js'
import { calculatePremium } from '../lib/premium.js'
import { makeReference } from '../lib/quote.js'
import { contract } from '../runtime/contract/index.js'
import { BASE, LAYOUT, breadcrumbs } from '../journey/index.js'
import { stepPath } from './paths.js'
import {
  renderCya,
  renderQuoteSummary,
  errorSummaryRows
} from './view-models.js'

/**
 * The three closing pages. Quote summary and confirmation match the rest of the
 * journey; Check Your Answers is the interesting one:
 *   - on LOAD  → soft: contract.missingRequired drives "you still need to…".
 *   - on SUBMIT → hard: contract.assembleQuote validates + transforms the whole
 *     quote (incl. a holistic business rule) and gates the route to confirmation.
 */

const STATUS_QUOTED = 'quoted'
const CONFIRMATION_TEMPLATE = 'standalone/spike-c/templates/confirmation'

const priceAndPersist = (quote) => {
  const premium = calculatePremium(quote)
  return { quote: updateQuote(quote.id, { premium }), premium }
}

const markQuoted = (quote) =>
  updateQuote(quote.id, {
    status: STATUS_QUOTED,
    reference: makeReference(quote.id)
  })

// Resolve the quote or short-circuit to the journey base.
export const withQuote = (handler) => (request, toolkit) => {
  const quote = findQuote(request.params.id)
  if (!quote) {
    return toolkit.redirect(BASE)
  }
  return handler(quote, request, toolkit)
}

export const getQuoteSummary = (quote, request, toolkit) => {
  const { quote: priced, premium } = priceAndPersist(quote)
  return renderQuoteSummary(priced, premium, toolkit)
}

export const postQuoteSummary = (quote, request, toolkit) =>
  toolkit.redirect(stepPath(quote.id, 'check-your-answers'))

export const getCheckYourAnswers = (quote, request, toolkit) =>
  renderCya(quote, toolkit)

export const postCheckYourAnswers = (quote, request, toolkit) => {
  const result = contract.assembleQuote(quote)
  if (!result.ok) {
    return renderCya(quote, toolkit, {
      errorSummary: errorSummaryRows(quote, result.errors)
    })
  }
  markQuoted(quote)
  return toolkit.redirect(stepPath(quote.id, 'confirmation'))
}

export const getConfirmation = (request, toolkit) => {
  const quote = findQuote(request.params.id)
  if (!quote || quote.status !== STATUS_QUOTED) {
    return toolkit.redirect(BASE)
  }
  return toolkit.view(CONFIRMATION_TEMPLATE, {
    layout: LAYOUT,
    pageTitle: 'Quote confirmed',
    quote,
    reference: quote.reference,
    premium: quote.premium,
    breadcrumbs: breadcrumbs(quote, 'Quote confirmed')
  })
}
