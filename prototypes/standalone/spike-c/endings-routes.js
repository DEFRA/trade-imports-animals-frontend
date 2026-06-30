import { findQuote, updateQuote } from './lib/store.js'
import { calculatePremium } from './lib/premium.js'
import { coverTypeLabel, extrasLabels, makeReference } from './lib/quote.js'
import { sectionBySlug, hasOwnRoutes } from './lib/sections/index.js'
import { contract } from './runtime/contract/index.js'
import { BASE, LAYOUT, breadcrumbs } from './journey/index.js'

/**
 * The three closing pages. Quote summary and confirmation match the rest of the
 * journey; Check Your Answers is the interesting one:
 *   - on LOAD  → soft: contract.missingRequired drives "you still need to…".
 *   - on SUBMIT → hard: contract.assembleQuote validates + transforms the whole
 *     quote (incl. a holistic business rule) and gates the route to confirmation.
 * Per-row value formatting is reused from the presentation layer (lib/sections).
 */

const open = { auth: false }
const STATUS_QUOTED = 'quoted'
const CHANGE_QUERY = '?change=1'
const QUOTE_SUMMARY_TEMPLATE = 'standalone/spike-c/templates/quote-summary'
const CYA_TEMPLATE = 'standalone/spike-c/templates/check-your-answers'
const CONFIRMATION_TEMPLATE = 'standalone/spike-c/templates/confirmation'

const stepPath = (id, slug) => `${BASE}/${id}/${slug}`

// Simple question pages round-trip via ?change=1; loops / fan-outs link to their
// own first page and return through their own flow.
const changeHref = (quote, stepId) => {
  const stepUrl = stepPath(quote.id, stepId)
  return contract.stepKind(stepId) ? stepUrl : `${stepUrl}${CHANGE_QUERY}`
}

const rowHref = (quote, section, stepId) =>
  hasOwnRoutes(section) ? stepPath(quote.id, stepId) : changeHref(quote, stepId)

const toSummaryRow = (row, href) => ({
  key: { text: row.key },
  value: { text: row.value },
  actions: {
    items: [{ href, text: 'Change', visuallyHiddenText: row.key.toLowerCase() }]
  }
})

const answerRows = (quote) =>
  contract.applicableSteps(quote).flatMap((stepId) => {
    const section = sectionBySlug.get(stepId)
    if (!section) {
      return []
    }
    const href = rowHref(quote, section, stepId)
    return section.rows(quote).map((row) => toSummaryRow(row, href))
  })

// Soft prompts: each still-missing required field, with its provenance reason.
const softPrompts = (quote) =>
  contract.missingRequired(quote).map((missingField) => ({
    stepId: missingField.stepId,
    text: contract.stepTitle(missingField.stepId),
    because: provenanceText(missingField.because),
    href: changeHref(quote, missingField.stepId)
  }))

const renderCya = (quote, toolkit, extras = {}) =>
  toolkit.view(CYA_TEMPLATE, {
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

const renderQuoteSummary = (quote, premium, toolkit) =>
  toolkit.view(QUOTE_SUMMARY_TEMPLATE, {
    layout: LAYOUT,
    pageTitle: 'Your quote',
    quote,
    premium,
    coverLabel: coverTypeLabel(quote.coverType),
    extras: extrasLabels(quote.extras),
    backLink: `${BASE}/${quote.id}`,
    breadcrumbs: breadcrumbs(quote, 'Your quote')
  })

const priceAndPersist = (quote) => {
  const premium = calculatePremium(quote)
  return { quote: updateQuote(quote.id, { premium }), premium }
}

const errorSummaryRows = (quote, errors) =>
  errors.map((error) => ({
    text: error.message,
    href: changeHref(quote, error.stepId)
  }))

const markQuoted = (quote) =>
  updateQuote(quote.id, {
    status: STATUS_QUOTED,
    reference: makeReference(quote.id)
  })

// Resolve the quote or short-circuit to the journey base.
const withQuote = (handler) => (request, toolkit) => {
  const quote = findQuote(request.params.id)
  if (!quote) {
    return toolkit.redirect(BASE)
  }
  return handler(quote, request, toolkit)
}

const getQuoteSummary = (quote, request, toolkit) => {
  const { quote: priced, premium } = priceAndPersist(quote)
  return renderQuoteSummary(priced, premium, toolkit)
}

const postQuoteSummary = (quote, request, toolkit) =>
  toolkit.redirect(stepPath(quote.id, 'check-your-answers'))

const getCheckYourAnswers = (quote, request, toolkit) =>
  renderCya(quote, toolkit)

const postCheckYourAnswers = (quote, request, toolkit) => {
  const result = contract.assembleQuote(quote)
  if (!result.ok) {
    return renderCya(quote, toolkit, {
      errorSummary: errorSummaryRows(quote, result.errors)
    })
  }
  markQuoted(quote)
  return toolkit.redirect(stepPath(quote.id, 'confirmation'))
}

const getConfirmation = (request, toolkit) => {
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
      handler: withQuote(postQuoteSummary)
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
      handler: withQuote(postCheckYourAnswers)
    },
    {
      method: 'GET',
      path: `${BASE}/{id}/confirmation`,
      options: open,
      handler: getConfirmation
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
