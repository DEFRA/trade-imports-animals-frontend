import { findQuote, updateQuote } from './lib/store.js'
import { calculatePremium } from './lib/premium.js'
import { coverTypeLabel, extrasLabels, makeReference } from './lib/quote.js'
import { sectionBySlug, hasOwnRoutes } from './lib/sections.js'
import { contract } from './runtime/contract.js'
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
const at = (id, slug) => `${BASE}/${id}/${slug}`

// Simple question pages round-trip via ?change=1; loops / fan-outs link to their
// own first page and return through their own flow.
const changeHref = (quote, stepId) => {
  const sub = at(quote.id, stepId)
  return contract.stepKind(stepId) ? sub : `${sub}?change=1`
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
  contract.missingRequired(quote).map((miss) => ({
    stepId: miss.stepId,
    text: contract.stepTitle(miss.stepId),
    because: provenanceText(miss.because),
    href: changeHref(quote, miss.stepId)
  }))

const renderCya = (quote, h, extras = {}) =>
  h.view('standalone/spike-c/templates/check-your-answers', {
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

export function endingsRoutes() {
  return [
    {
      method: 'GET',
      path: `${BASE}/{id}/quote-summary`,
      options: open,
      handler(request, h) {
        const quote = findQuote(request.params.id)
        if (!quote) {
          return h.redirect(BASE)
        }
        const premium = calculatePremium(quote)
        const updated = updateQuote(quote.id, { premium })
        return h.view('standalone/spike-c/templates/quote-summary', {
          layout: LAYOUT,
          pageTitle: 'Your quote',
          quote: updated,
          premium,
          coverLabel: coverTypeLabel(updated.coverType),
          extras: extrasLabels(updated.extras),
          backLink: `${BASE}/${updated.id}`,
          breadcrumbs: breadcrumbs(updated, 'Your quote')
        })
      }
    },
    {
      method: 'POST',
      path: `${BASE}/{id}/quote-summary`,
      options: open,
      handler(request, h) {
        const quote = findQuote(request.params.id)
        return quote
          ? h.redirect(at(quote.id, 'check-your-answers'))
          : h.redirect(BASE)
      }
    },
    {
      method: 'GET',
      path: `${BASE}/{id}/check-your-answers`,
      options: open,
      handler(request, h) {
        const quote = findQuote(request.params.id)
        if (!quote) {
          return h.redirect(BASE)
        }
        return renderCya(quote, h)
      }
    },
    {
      method: 'POST',
      path: `${BASE}/{id}/check-your-answers`,
      options: open,
      handler(request, h) {
        const quote = findQuote(request.params.id)
        if (!quote) {
          return h.redirect(BASE)
        }
        // Hard gate: assemble + transform + validate the full quote object.
        const result = contract.assembleQuote(quote)
        if (!result.ok) {
          const errorSummary = result.errors.map((error) => ({
            text: error.message,
            href: changeHref(quote, error.stepId)
          }))
          return renderCya(quote, h, { errorSummary })
        }
        updateQuote(quote.id, {
          status: 'quoted',
          reference: makeReference(quote.id)
        })
        return h.redirect(at(quote.id, 'confirmation'))
      }
    },
    {
      method: 'GET',
      path: `${BASE}/{id}/confirmation`,
      options: open,
      handler(request, h) {
        const quote = findQuote(request.params.id)
        if (!quote || quote.status !== 'quoted') {
          return h.redirect(BASE)
        }
        return h.view('standalone/spike-c/templates/confirmation', {
          layout: LAYOUT,
          pageTitle: 'Quote confirmed',
          quote,
          reference: quote.reference,
          premium: quote.premium,
          breadcrumbs: breadcrumbs(quote, 'Quote confirmed')
        })
      }
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
