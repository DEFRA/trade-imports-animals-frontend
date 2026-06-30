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
        return h.view('standalone/spike-b/templates/quote-summary', {
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
        return h.view('standalone/spike-b/templates/confirmation', {
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
