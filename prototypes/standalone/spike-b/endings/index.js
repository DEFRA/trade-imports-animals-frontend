import { findQuote, updateQuote } from '../lib/store.js'
import { calculatePremium } from '../lib/premium.js'
import { coverTypeLabel, extrasLabels, makeReference } from '../lib/quote.js'
import { contract } from '../runtime/contract.js'
import { BASE, LAYOUT, breadcrumbs } from '../journey/index.js'
import { at, changeHref, renderCya } from './check-answers.js'

/**
 * The three closing pages. Quote summary and confirmation match the rest of the
 * journey; Check Your Answers is the interesting one:
 *   - on LOAD  → soft: contract.missingRequired drives "you still need to…".
 *   - on SUBMIT → hard: contract.assembleQuote validates + transforms the whole
 *     quote (incl. a holistic business rule) and gates the route to confirmation.
 */

const open = { auth: false }
const STATUS_QUOTED = 'quoted'
const QUOTE_SUMMARY_VIEW = 'standalone/spike-b/templates/quote-summary'
const CONFIRMATION_VIEW = 'standalone/spike-b/templates/confirmation'

const priceQuote = (quote) => {
  const premium = calculatePremium(quote)
  const updated = updateQuote(quote.id, { premium })
  return { updated, premium }
}

const quoteSummaryView = (quote, premium) => ({
  layout: LAYOUT,
  pageTitle: 'Your quote',
  quote,
  premium,
  coverLabel: coverTypeLabel(quote.coverType),
  extras: extrasLabels(quote.extras),
  backLink: `${BASE}/${quote.id}`,
  breadcrumbs: breadcrumbs(quote, 'Your quote')
})

const toErrorSummary = (quote, errors) =>
  errors.map((error) => ({
    text: error.message,
    href: changeHref(quote, error.stepId)
  }))

const markQuoted = (quote) =>
  updateQuote(quote.id, {
    status: STATUS_QUOTED,
    reference: makeReference(quote.id)
  })

const getQuoteSummary = (request, responseToolkit) => {
  const quote = findQuote(request.params.id)
  if (!quote) {
    return responseToolkit.redirect(BASE)
  }
  const { updated, premium } = priceQuote(quote)
  return responseToolkit.view(
    QUOTE_SUMMARY_VIEW,
    quoteSummaryView(updated, premium)
  )
}

const postQuoteSummary = (request, responseToolkit) => {
  const quote = findQuote(request.params.id)
  return quote
    ? responseToolkit.redirect(at(quote.id, 'check-your-answers'))
    : responseToolkit.redirect(BASE)
}

const getCheckAnswers = (request, responseToolkit) => {
  const quote = findQuote(request.params.id)
  if (!quote) {
    return responseToolkit.redirect(BASE)
  }
  return renderCya(quote, responseToolkit)
}

const postCheckAnswers = (request, responseToolkit) => {
  const quote = findQuote(request.params.id)
  if (!quote) {
    return responseToolkit.redirect(BASE)
  }
  // Hard gate: assemble + transform + validate the full quote object.
  const result = contract.assembleQuote(quote)
  if (!result.ok) {
    return renderCya(quote, responseToolkit, {
      errorSummary: toErrorSummary(quote, result.errors)
    })
  }
  markQuoted(quote)
  return responseToolkit.redirect(at(quote.id, 'confirmation'))
}

const getConfirmation = (request, responseToolkit) => {
  const quote = findQuote(request.params.id)
  if (!quote || quote.status !== STATUS_QUOTED) {
    return responseToolkit.redirect(BASE)
  }
  return responseToolkit.view(CONFIRMATION_VIEW, {
    layout: LAYOUT,
    pageTitle: 'Quote confirmed',
    quote,
    reference: quote.reference,
    premium: quote.premium,
    breadcrumbs: breadcrumbs(quote, 'Quote confirmed')
  })
}

export function endingsRoutes() {
  return [
    {
      method: 'GET',
      path: `${BASE}/{id}/quote-summary`,
      options: open,
      handler: getQuoteSummary
    },
    {
      method: 'POST',
      path: `${BASE}/{id}/quote-summary`,
      options: open,
      handler: postQuoteSummary
    },
    {
      method: 'GET',
      path: `${BASE}/{id}/check-your-answers`,
      options: open,
      handler: getCheckAnswers
    },
    {
      method: 'POST',
      path: `${BASE}/{id}/check-your-answers`,
      options: open,
      handler: postCheckAnswers
    },
    {
      method: 'GET',
      path: `${BASE}/{id}/confirmation`,
      options: open,
      handler: getConfirmation
    }
  ]
}
