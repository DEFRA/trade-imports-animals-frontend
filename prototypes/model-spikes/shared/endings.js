import { findQuote, updateQuote } from '../../shared/store.js'
import { calculatePremium } from '../../shared/premium.js'
import {
  coverTypeLabel,
  extrasLabels,
  makeReference
} from '../../shared/quote.js'
import { sectionBySlug, hasOwnRoutes } from '../../shared/sections.js'

/**
 * The three closing pages (quote summary, check your answers, confirmation) for a
 * spike variant. Quote summary and confirmation match the hand-written
 * prototypes; the difference is Check Your Answers, which is wired to the
 * contract per validation.md:
 *
 *   - on LOAD  → soft: `missingRequired` drives "you still need to…" prompts.
 *   - on SUBMIT → hard: `assembleQuote` validates + transforms the whole quote
 *     (incl. a holistic business rule) and gates the route to confirmation.
 *
 * Applicability and provenance come from the contract; the per-row value
 * formatting is reused from the existing presentation layer (sections.js rows).
 */
export function spikeEndings({ contract, base, layout, shape, breadcrumbs }) {
  const open = { auth: false }
  const at = (id, slug) => `${base}/${id}/${slug}`
  const crumbs = (quote, title) =>
    breadcrumbs ? breadcrumbs(quote, title) : undefined

  // Simple question pages round-trip via ?change=1; loops / subtask fan-outs
  // link to their own first page and return through their own flow.
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
            {
              href,
              text: 'Change',
              visuallyHiddenText: row.key.toLowerCase()
            }
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
    h.view('model-spikes/shared/check-your-answers', {
      layout,
      pageTitle: 'Check your answers',
      quote,
      premium: quote.premium,
      rows: answerRows(quote),
      incomplete: softPrompts(quote),
      backLink: at(quote.id, 'quote-summary'),
      breadcrumbs: crumbs(quote, 'Check your answers'),
      ...extras
    })

  return [
    {
      method: 'GET',
      path: `${base}/{id}/quote-summary`,
      options: open,
      handler(request, h) {
        const quote = findQuote(request.params.id)
        if (!quote) {
          return h.redirect(base)
        }
        const premium = calculatePremium(quote)
        const updated = updateQuote(quote.id, { premium })
        return h.view('shared/quote-summary', {
          layout,
          pageTitle: 'Your quote',
          quote: updated,
          premium,
          coverLabel: coverTypeLabel(updated.coverType),
          extras: extrasLabels(updated.extras),
          backLink: summaryBack(contract, base, updated, shape),
          breadcrumbs: crumbs(updated, 'Your quote')
        })
      }
    },
    {
      method: 'POST',
      path: `${base}/{id}/quote-summary`,
      options: open,
      handler(request, h) {
        const quote = findQuote(request.params.id)
        return quote
          ? h.redirect(at(quote.id, 'check-your-answers'))
          : h.redirect(base)
      }
    },
    {
      method: 'GET',
      path: `${base}/{id}/check-your-answers`,
      options: open,
      handler(request, h) {
        const quote = findQuote(request.params.id)
        if (!quote) {
          return h.redirect(base)
        }
        return renderCya(quote, h)
      }
    },
    {
      method: 'POST',
      path: `${base}/{id}/check-your-answers`,
      options: open,
      handler(request, h) {
        const quote = findQuote(request.params.id)
        if (!quote) {
          return h.redirect(base)
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
      path: `${base}/{id}/confirmation`,
      options: open,
      handler(request, h) {
        const quote = findQuote(request.params.id)
        if (!quote || quote.status !== 'quoted') {
          return h.redirect(base)
        }
        return h.view('shared/confirmation', {
          layout,
          pageTitle: 'Quote confirmed',
          quote,
          reference: quote.reference,
          premium: quote.premium,
          breadcrumbs: crumbs(quote, 'Quote confirmed')
        })
      }
    }
  ]
}

// Back link from the quote summary
function summaryBack(_contract, base, quote, _shape) {
  return `${base}/${quote.id}`
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
