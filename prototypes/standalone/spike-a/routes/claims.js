import { findQuote } from '../lib/store.js'
import { currencySchema, validatePayload } from '../lib/validate/index.js'
import {
  getClaims,
  addClaim,
  removeClaim,
  markClaimsDone,
  claimTypeItems,
  claimLabel
} from '../lib/claims.js'
import { navBack, navNext } from '../journey/navigation.js'
import { BASE, LAYOUT, breadcrumbs } from '../journey/config.js'

/**
 * The "add another" claims loop, as plain routes for this journey. Driving
 * history asks whether the driver has had a claim; if yes they drop into this
 * loop, add 0..N claims one at a time via a list page, then rejoin the main
 * flow. URL scheme:
 *   {base}/{id}/claims              the manage list (loop hub)
 *   {base}/{id}/claims/add          add one claim
 *   {base}/{id}/claims/{index}/remove
 */

// Optional schema for the add-a-claim form — today just the currency amount.
const claimsAddSchema = currencySchema({
  name: 'claimAmount',
  enterMessage: 'Enter the approximate claim amount',
  formatMessage:
    'Claim amount must be a whole number of pounds greater than 0, like 1500'
})

const at = (id, suffix) => `${BASE}/${id}/${suffix}`

export function claimsRoutes() {
  const open = { auth: false }
  return [
    {
      method: 'GET',
      path: `${BASE}/{id}/claims`,
      options: open,
      handler(request, h) {
        const quote = findQuote(request.params.id)
        if (!quote) {
          return h.redirect(BASE)
        }
        const rows = getClaims(quote).map((claim, index) => ({
          key: { text: `Claim ${index + 1}` },
          value: { text: claimLabel(claim) },
          actions: {
            items: [
              {
                href: at(quote.id, `claims/${index}/remove`),
                text: 'Remove',
                visuallyHiddenText: `claim ${index + 1}`
              }
            ]
          }
        }))
        return h.view('standalone/spike-a/templates/claims-list', {
          layout: LAYOUT,
          pageTitle: 'Claims you have added',
          quote,
          rows,
          backLink: navBack(quote.id, 'claims'),
          breadcrumbs: breadcrumbs(quote, 'Your claims')
        })
      }
    },
    {
      method: 'POST',
      path: `${BASE}/{id}/claims`,
      options: open,
      handler(request, h) {
        const quote = findQuote(request.params.id)
        if (!quote) {
          return h.redirect(BASE)
        }
        if (request.payload.action === 'add') {
          return h.redirect(at(quote.id, 'claims/add'))
        }
        markClaimsDone(quote)
        return h.redirect(navNext(quote.id, 'claims'))
      }
    },
    {
      method: 'GET',
      path: `${BASE}/{id}/claims/add`,
      options: open,
      handler(request, h) {
        const quote = findQuote(request.params.id)
        if (!quote) {
          return h.redirect(BASE)
        }
        return h.view('standalone/spike-a/templates/claims-add', {
          layout: LAYOUT,
          pageTitle: 'Add a claim',
          quote,
          items: claimTypeItems(),
          backLink: at(quote.id, 'claims'),
          breadcrumbs: breadcrumbs(quote, 'Add a claim')
        })
      }
    },
    {
      method: 'POST',
      path: `${BASE}/{id}/claims/add`,
      options: open,
      handler(request, h) {
        const quote = findQuote(request.params.id)
        if (!quote) {
          return h.redirect(BASE)
        }
        const { value, errors, errorSummary } = validatePayload(
          claimsAddSchema,
          request.payload
        )
        if (errors) {
          return h.view('standalone/spike-a/templates/claims-add', {
            layout: LAYOUT,
            pageTitle: 'Add a claim',
            quote,
            items: claimTypeItems(request.payload.claimType),
            backLink: at(quote.id, 'claims'),
            breadcrumbs: breadcrumbs(quote, 'Add a claim'),
            errors,
            errorSummary,
            values: request.payload
          })
        }
        addClaim(quote, value)
        return h.redirect(at(quote.id, 'claims'))
      }
    },
    {
      method: 'GET',
      path: `${BASE}/{id}/claims/{index}/remove`,
      options: open,
      handler(request, h) {
        const quote = findQuote(request.params.id)
        if (!quote) {
          return h.redirect(BASE)
        }
        removeClaim(quote, Number(request.params.index))
        return h.redirect(at(quote.id, 'claims'))
      }
    }
  ]
}
