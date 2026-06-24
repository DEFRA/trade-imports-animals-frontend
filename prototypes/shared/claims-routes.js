import { findQuote } from './store.js'
import { currencySchema, validatePayload } from './validate.js'
import {
  getClaims,
  addClaim,
  removeClaim,
  markClaimsDone,
  claimTypeItems,
  claimLabel
} from './claims.js'

// Optional schema for the add-a-claim form. Today: just the currency amount.
// `claimType` (radio) is unvalidated for now — covered by a later iteration.
const claimsAddSchema = currencySchema({
  name: 'claimAmount',
  enterMessage: 'Enter the approximate claim amount',
  formatMessage:
    'Claim amount must be a whole number of pounds greater than 0, like 1500'
})

/**
 * The add-another claims loop as ready-to-register Hapi routes, shared by every
 * variant. The variant supplies its base path, layout, and where Back / Continue
 * go. URL scheme:
 *   {base}/{id}/claims              the manage list (loop hub)
 *   {base}/{id}/claims/add          add one claim
 *   {base}/{id}/claims/{index}/remove
 *
 * @param {object} config
 * @param {string} config.basePath
 * @param {string} config.layout
 * @param {(id: string) => string} config.claimsBack - Back link on the list
 * @param {(id: string) => string} config.afterClaims - where Continue leaves to
 */
export function claimsRoutes({
  basePath,
  layout,
  claimsBack,
  afterClaims,
  breadcrumbs
}) {
  const open = { auth: false }
  const at = (id, suffix) => `${basePath}/${id}/${suffix}`
  const crumbs = (quote, title) =>
    breadcrumbs ? breadcrumbs(quote, title) : undefined

  const guard = (request, h) => findQuote(request.params.id)

  return [
    {
      method: 'GET',
      path: `${basePath}/{id}/claims`,
      options: open,
      handler(request, h) {
        const quote = guard(request, h)
        if (!quote) {
          return h.redirect(basePath)
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
        return h.view('shared/claims-list', {
          layout,
          pageTitle: 'Claims you have added',
          quote,
          rows,
          backLink: claimsBack(quote.id),
          breadcrumbs: crumbs(quote, 'Your claims')
        })
      }
    },
    {
      method: 'POST',
      path: `${basePath}/{id}/claims`,
      options: open,
      handler(request, h) {
        const quote = guard(request, h)
        if (!quote) {
          return h.redirect(basePath)
        }
        if (request.payload.action === 'add') {
          return h.redirect(at(quote.id, 'claims/add'))
        }
        markClaimsDone(quote)
        return h.redirect(afterClaims(quote.id))
      }
    },
    {
      method: 'GET',
      path: `${basePath}/{id}/claims/add`,
      options: open,
      handler(request, h) {
        const quote = guard(request, h)
        if (!quote) {
          return h.redirect(basePath)
        }
        return h.view('shared/claims-add', {
          layout,
          pageTitle: 'Add a claim',
          quote,
          items: claimTypeItems(),
          backLink: at(quote.id, 'claims'),
          breadcrumbs: crumbs(quote, 'Add a claim')
        })
      }
    },
    {
      method: 'POST',
      path: `${basePath}/{id}/claims/add`,
      options: open,
      handler(request, h) {
        const quote = guard(request, h)
        if (!quote) {
          return h.redirect(basePath)
        }
        const { value, errors, errorSummary } = validatePayload(
          claimsAddSchema,
          request.payload
        )
        if (errors) {
          return h.view('shared/claims-add', {
            layout,
            pageTitle: 'Add a claim',
            quote,
            items: claimTypeItems(request.payload.claimType),
            backLink: at(quote.id, 'claims'),
            breadcrumbs: crumbs(quote, 'Add a claim'),
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
      path: `${basePath}/{id}/claims/{index}/remove`,
      options: open,
      handler(request, h) {
        const quote = guard(request, h)
        if (!quote) {
          return h.redirect(basePath)
        }
        removeClaim(quote, Number(request.params.index))
        return h.redirect(at(quote.id, 'claims'))
      }
    }
  ]
}
