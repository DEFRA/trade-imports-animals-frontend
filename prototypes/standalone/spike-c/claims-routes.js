import { findQuote } from './lib/store.js'
import { currencySchema, validatePayload } from './lib/validate/index.js'
import {
  getClaims,
  addClaim,
  removeClaim,
  markClaimsDone,
  claimTypeItems,
  claimLabel
} from './lib/claims.js'
import { BASE, LAYOUT, breadcrumbs, navBack, navNext } from './journey/index.js'

/**
 * The "add another" claims loop, as plain routes for this journey. Driving
 * history asks whether the driver has had a claim; if yes they drop into this
 * loop, add 0..N claims one at a time via a list page, then rejoin the main
 * flow. URL scheme:
 *   {base}/{id}/claims              the manage list (loop hub)
 *   {base}/{id}/claims/add          add one claim
 *   {base}/{id}/claims/{index}/remove
 */

const open = { auth: false }
const TEMPLATE_CLAIMS_LIST = 'standalone/spike-c/templates/claims-list'
const TEMPLATE_CLAIMS_ADD = 'standalone/spike-c/templates/claims-add'
const ACTION_ADD = 'add'

// Optional schema for the add-a-claim form — today just the currency amount.
const claimsAddSchema = currencySchema({
  name: 'claimAmount',
  enterMessage: 'Enter the approximate claim amount',
  formatMessage:
    'Claim amount must be a whole number of pounds greater than 0, like 1500'
})

const claimsPath = (id, suffix) => `${BASE}/${id}/${suffix}`

// Resolve the quote or short-circuit to the journey base.
const withQuote = (handler) => (request, toolkit) => {
  const quote = findQuote(request.params.id)
  if (!quote) {
    return toolkit.redirect(BASE)
  }
  return handler(quote, request, toolkit)
}

const claimRows = (quote) =>
  getClaims(quote).map((claim, index) => ({
    key: { text: `Claim ${index + 1}` },
    value: { text: claimLabel(claim) },
    actions: {
      items: [
        {
          href: claimsPath(quote.id, `claims/${index}/remove`),
          text: 'Remove',
          visuallyHiddenText: `claim ${index + 1}`
        }
      ]
    }
  }))

const addClaimView = (quote, { claimType, ...rest } = {}) => ({
  layout: LAYOUT,
  pageTitle: 'Add a claim',
  quote,
  items: claimTypeItems(claimType),
  backLink: claimsPath(quote.id, 'claims'),
  breadcrumbs: breadcrumbs(quote, 'Add a claim'),
  ...rest
})

const renderClaimsList = (quote, request, toolkit) =>
  toolkit.view(TEMPLATE_CLAIMS_LIST, {
    layout: LAYOUT,
    pageTitle: 'Claims you have added',
    quote,
    rows: claimRows(quote),
    backLink: navBack(quote.id, 'claims'),
    breadcrumbs: breadcrumbs(quote, 'Your claims')
  })

const postClaimsList = (quote, request, toolkit) => {
  if (request.payload.action === ACTION_ADD) {
    return toolkit.redirect(claimsPath(quote.id, 'claims/add'))
  }
  markClaimsDone(quote)
  return toolkit.redirect(navNext(quote.id, 'claims'))
}

const renderAddClaim = (quote, request, toolkit) =>
  toolkit.view(TEMPLATE_CLAIMS_ADD, addClaimView(quote))

const postAddClaim = (quote, request, toolkit) => {
  const { value, errors, errorSummary } = validatePayload(
    claimsAddSchema,
    request.payload
  )
  if (errors) {
    return toolkit.view(
      TEMPLATE_CLAIMS_ADD,
      addClaimView(quote, {
        errors,
        errorSummary,
        values: request.payload,
        claimType: request.payload.claimType
      })
    )
  }
  addClaim(quote, value)
  return toolkit.redirect(claimsPath(quote.id, 'claims'))
}

const postRemoveClaim = (quote, request, toolkit) => {
  removeClaim(quote, Number(request.params.index))
  return toolkit.redirect(claimsPath(quote.id, 'claims'))
}

export function claimsRoutes() {
  return [
    {
      method: 'GET',
      path: `${BASE}/{id}/claims`,
      options: open,
      handler: withQuote(renderClaimsList)
    },
    {
      method: 'POST',
      path: `${BASE}/{id}/claims`,
      options: open,
      handler: withQuote(postClaimsList)
    },
    {
      method: 'GET',
      path: `${BASE}/{id}/claims/add`,
      options: open,
      handler: withQuote(renderAddClaim)
    },
    {
      method: 'POST',
      path: `${BASE}/{id}/claims/add`,
      options: open,
      handler: withQuote(postAddClaim)
    },
    {
      method: 'GET',
      path: `${BASE}/{id}/claims/{index}/remove`,
      options: open,
      handler: withQuote(postRemoveClaim)
    }
  ]
}
