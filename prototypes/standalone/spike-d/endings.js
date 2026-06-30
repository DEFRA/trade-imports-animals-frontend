import { findQuote, updateQuote } from './lib/store.js'
import { calculatePremium } from './lib/premium.js'
import { coverTypeLabel, extrasLabels, makeReference } from './lib/quote.js'
import { sectionBySlug, hasOwnRoutes } from './lib/sections/index.js'
import { contract } from './runtime/index.js'
import { BASE, LAYOUT, breadcrumbs } from './journey.js'

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
const at = (id, slug) => `${BASE}/${id}/${slug}`

// Simple question pages round-trip via ?change=1; loops / fan-outs link to their
// own first page and return through their own flow.
const changeHref = (quote, stepId) => {
  const stepHref = at(quote.id, stepId)
  return contract.stepKind(stepId) ? stepHref : `${stepHref}?change=1`
}

const answerRows = (quote) =>
  contract.applicableSteps(quote).flatMap((stepId) => {
    const section = sectionBySlug.get(stepId)
    if (!section) {
      return []
    }
    const href = hasOwnRoutes(section)
      ? at(quote.id, stepId)
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
  contract.missingRequired(quote).map((missingField) => ({
    stepId: missingField.stepId,
    text: contract.stepTitle(missingField.stepId),
    because: provenanceText(missingField.because),
    href: changeHref(quote, missingField.stepId)
  }))

const renderCya = (quote, responseToolkit, extras = {}) =>
  responseToolkit.view('standalone/spike-d/templates/check-your-answers', {
    layout: LAYOUT,
    pageTitle: 'Check your answers',
    quote,
    premium: quote.premium,
    rows: answerRows(quote),
    incomplete: softPrompts(quote),
    backLink: at(quote.id, 'quote-summary'),
    breadcrumbs: breadcrumbs(quote, 'Check your answers'),
    ...extras
  })

// Resolve the quote once and short-circuit to BASE when it is missing.
const withQuote = (handler) => (request, responseToolkit) => {
  const quote = findQuote(request.params.id)
  if (!quote) {
    return responseToolkit.redirect(BASE)
  }
  return handler(quote, request, responseToolkit)
}

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

const buildErrorSummary = (quote, errors) =>
  errors.map((error) => ({
    text: error.message,
    href: changeHref(quote, error.stepId)
  }))

const confirmQuote = (quote) =>
  updateQuote(quote.id, {
    status: STATUS_QUOTED,
    reference: makeReference(quote.id)
  })

const quoteSummaryGet = withQuote((quote, request, responseToolkit) =>
  renderQuoteSummary(priceQuote(quote), responseToolkit)
)

const quoteSummaryPost = withQuote((quote, request, responseToolkit) =>
  responseToolkit.redirect(at(quote.id, 'check-your-answers'))
)

const checkYourAnswersGet = withQuote((quote, request, responseToolkit) =>
  renderCya(quote, responseToolkit)
)

const checkYourAnswersPost = withQuote((quote, request, responseToolkit) => {
  // Hard gate: assemble + transform + validate the full quote object.
  const result = contract.assembleQuote(quote)
  if (!result.ok) {
    return renderCya(quote, responseToolkit, {
      errorSummary: buildErrorSummary(quote, result.errors)
    })
  }
  confirmQuote(quote)
  return responseToolkit.redirect(at(quote.id, 'confirmation'))
})

const confirmationGet = withQuote((quote, request, responseToolkit) => {
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

export function endingsRoutes() {
  return [
    {
      method: 'GET',
      path: `${BASE}/{id}/quote-summary`,
      options: open,
      handler: quoteSummaryGet
    },
    {
      method: 'POST',
      path: `${BASE}/{id}/quote-summary`,
      options: open,
      handler: quoteSummaryPost
    },
    {
      method: 'GET',
      path: `${BASE}/{id}/check-your-answers`,
      options: open,
      handler: checkYourAnswersGet
    },
    {
      method: 'POST',
      path: `${BASE}/{id}/check-your-answers`,
      options: open,
      handler: checkYourAnswersPost
    },
    {
      method: 'GET',
      path: `${BASE}/{id}/confirmation`,
      options: open,
      handler: confirmationGet
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
