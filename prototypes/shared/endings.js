import { findQuote, updateQuote } from './store.js'
import { calculatePremium } from './premium.js'
import { answerRows, sectionBySlug, hasOwnRoutes } from './sections.js'
import { coverTypeLabel, extrasLabels, makeReference } from './quote.js'

/**
 * The three closing pages every variant shares — quote summary, check your
 * answers and confirmation — as ready-to-register Hapi routes. All variants use
 * the same `${basePath}/{id}/<slug>` URL scheme, so only the base path, layout
 * and "back from summary" target differ.
 *
 * @param {object} config
 * @param {string} config.basePath - e.g. /prototype/linear
 * @param {string} config.layout - variant layout template path
 * @param {(id: string) => string} config.summaryBackPath - Back link on summary
 * @returns {Array<object>} Hapi route definitions (auth disabled by caller)
 */
export function endingRoutes({
  basePath,
  layout,
  summaryBackPath,
  breadcrumbs
}) {
  const open = { auth: false }
  const at = (id, slug) => `${basePath}/${id}/${slug}`
  const crumbs = (quote, title) =>
    breadcrumbs ? breadcrumbs(quote, title) : undefined

  const guard = (request, h) => findQuote(request.params.id)

  return [
    {
      method: 'GET',
      path: `${basePath}/{id}/quote-summary`,
      options: open,
      handler(request, h) {
        const quote = guard(request, h)
        if (!quote) {
          return h.redirect(basePath)
        }
        // Recalculate and persist the indicative premium from the latest answers.
        const premium = calculatePremium(quote)
        const updated = updateQuote(quote.id, { premium })
        return h.view('shared/quote-summary', {
          layout,
          pageTitle: 'Your quote',
          quote: updated,
          premium,
          coverLabel: coverTypeLabel(updated.coverType),
          extras: extrasLabels(updated.extras),
          backLink: summaryBackPath(updated.id),
          breadcrumbs: crumbs(updated, 'Your quote')
        })
      }
    },
    {
      method: 'POST',
      path: `${basePath}/{id}/quote-summary`,
      options: open,
      handler(request, h) {
        const quote = guard(request, h)
        return quote
          ? h.redirect(at(quote.id, 'check-your-answers'))
          : h.redirect(basePath)
      }
    },
    {
      method: 'GET',
      path: `${basePath}/{id}/check-your-answers`,
      options: open,
      handler(request, h) {
        const quote = guard(request, h)
        if (!quote) {
          return h.redirect(basePath)
        }
        // Simple question pages round-trip back to CYA via ?change=1; loops and
        // subtask fan-outs link to their own pages and return via their flow.
        const changeHref = (slug) => {
          const section = sectionBySlug.get(slug)
          const base = at(quote.id, slug)
          return section && hasOwnRoutes(section) ? base : `${base}?change=1`
        }
        const rows = answerRows(quote).map((row) => ({
          key: { text: row.key },
          value: { text: row.value },
          actions: {
            items: [
              {
                href: changeHref(row.slug),
                text: 'Change',
                visuallyHiddenText: row.key.toLowerCase()
              }
            ]
          }
        }))
        return h.view('shared/check-your-answers', {
          layout,
          pageTitle: 'Check your answers',
          quote,
          premium: quote.premium,
          rows,
          backLink: at(quote.id, 'quote-summary'),
          breadcrumbs: crumbs(quote, 'Check your answers')
        })
      }
    },
    {
      method: 'POST',
      path: `${basePath}/{id}/check-your-answers`,
      options: open,
      handler(request, h) {
        const quote = guard(request, h)
        if (!quote) {
          return h.redirect(basePath)
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
      path: `${basePath}/{id}/confirmation`,
      options: open,
      handler(request, h) {
        const quote = guard(request, h)
        if (!quote || quote.status !== 'quoted') {
          return h.redirect(basePath)
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
