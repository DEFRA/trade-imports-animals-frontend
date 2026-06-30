import { findQuote, updateQuote } from '../lib/store.js'
import { calculatePremium } from '../lib/premium.js'
import { coverTypeLabel, extrasLabels, makeReference } from '../lib/quote.js'
import { sectionBySlug, hasOwnRoutes } from '../lib/sections/index.js'
import { contract } from '../runtime/selectors.js'
import { BASE, LAYOUT, breadcrumbs } from '../journey/config.js'

/**
 * The three closing pages. Quote summary and confirmation match the rest of the
 * journey; Check Your Answers is the interesting one:
 *   - on LOAD  → soft: contract.missingRequired drives "you still need to…".
 *   - on SUBMIT → hard: contract.assembleQuote validates + transforms the whole
 *     quote (incl. a holistic business rule) and gates the route to confirmation.
 * Per-row value formatting is reused from the presentation layer (lib/sections).
 */

const STATUS_QUOTED = 'quoted'

const open = { auth: false }
const stepPath = (id, slug) => `${BASE}/${id}/${slug}`

// Load the quote once and short-circuit to BASE when it is missing, so each
// handler receives a resolved quote and never repeats the guard.
const withQuote = (handler) => (request, h) => {
  const quote = findQuote(request.params.id)
  return quote ? handler(quote, request, h) : h.redirect(BASE)
}

// Simple question pages round-trip via ?change=1; loops / fan-outs link to their
// own first page and return through their own flow.
const changeHref = (quote, stepId) => {
  const basePath = stepPath(quote.id, stepId)
  return contract.stepKind(stepId) ? basePath : `${basePath}?change=1`
}

const answerRows = (quote) =>
  contract.applicableSteps(quote).flatMap((stepId) => {
    const section = sectionBySlug.get(stepId)
    if (!section) {
      return []
    }
    const href = hasOwnRoutes(section)
      ? stepPath(quote.id, stepId)
      : changeHref(quote, stepId)
    return section.rows(quote).map((row) => ({
      key: { text: row.key },
      value: { text: row.value },
      actions: {
        items: [
          { href, text: 'Change', visuallyHiddenText: row.key.toLowerCase() }
        ]
      }
    }))
  })

// Soft prompts: each still-missing required field, with its provenance reason.
const softPrompts = (quote) =>
  contract.missingRequired(quote).map((missing) => ({
    stepId: missing.stepId,
    text: contract.stepTitle(missing.stepId),
    because: provenanceText(missing.because),
    href: changeHref(quote, missing.stepId)
  }))

const errorRows = (result, quote) =>
  result.errors.map((error) => ({
    text: error.message,
    href: changeHref(quote, error.stepId)
  }))

const markQuoted = (quote) =>
  updateQuote(quote.id, {
    status: STATUS_QUOTED,
    reference: makeReference(quote.id)
  })

const priceQuote = (quote) => {
  const premium = calculatePremium(quote)
  return { premium, updated: updateQuote(quote.id, { premium }) }
}

const renderCya = (quote, h, extras = {}) =>
  h.view('standalone/spike-a/templates/check-your-answers', {
    layout: LAYOUT,
    pageTitle: 'Check your answers',
    quote,
    premium: quote.premium,
    rows: answerRows(quote),
    incomplete: softPrompts(quote),
    backLink: stepPath(quote.id, 'quote-summary'),
    breadcrumbs: breadcrumbs(quote, 'Check your answers'),
    ...extras
  })

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

const getQuoteSummary = (quote, request, h) => {
  const { premium, updated } = priceQuote(quote)
  return renderQuoteSummary(updated, premium, h)
}

const submitQuoteSummary = (quote, request, h) =>
  h.redirect(stepPath(quote.id, 'check-your-answers'))

const getCheckYourAnswers = (quote, request, h) => renderCya(quote, h)

const submitCheckYourAnswers = (quote, request, h) => {
  // Hard gate: assemble + transform + validate the full quote object.
  const result = contract.assembleQuote(quote)
  if (!result.ok) {
    return renderCya(quote, h, { errorSummary: errorRows(result, quote) })
  }
  markQuoted(quote)
  return h.redirect(stepPath(quote.id, 'confirmation'))
}

const getConfirmation = (quote, request, h) => {
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

export function endingsRoutes() {
  return [
    {
      method: 'GET',
      path: `${BASE}/{id}/quote-summary`,
      options: open,
      handler: withQuote(getQuoteSummary)
    },
    {
      method: 'POST',
      path: `${BASE}/{id}/quote-summary`,
      options: open,
      handler: withQuote(submitQuoteSummary)
    },
    {
      method: 'GET',
      path: `${BASE}/{id}/check-your-answers`,
      options: open,
      handler: withQuote(getCheckYourAnswers)
    },
    {
      method: 'POST',
      path: `${BASE}/{id}/check-your-answers`,
      options: open,
      handler: withQuote(submitCheckYourAnswers)
    },
    {
      method: 'GET',
      path: `${BASE}/{id}/confirmation`,
      options: open,
      handler: withQuote(getConfirmation)
    }
  ]
}

function provenanceText(because) {
  if (!because || because.length === 0) {
    return undefined
  }
  return because.map((entry) => entry.reason ?? describe(entry)).join('; ')
}

function describe(entry) {
  if (entry.field && entry.eq !== undefined) {
    return `${entry.field} = ${entry.eq}`
  }
  return JSON.stringify(entry)
}
