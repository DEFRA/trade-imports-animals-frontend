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
import { BASE, LAYOUT, breadcrumbs, navBack, navNext } from './journey.js'

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

const ACTION_ADD = 'add'

const claimsPath = (id, suffix) => `${BASE}/${id}/${suffix}`

// Resolve the quote once and short-circuit to BASE when it is missing.
const withQuote = (handler) => (request, responseToolkit) => {
  const quote = findQuote(request.params.id)
  if (!quote) {
    return responseToolkit.redirect(BASE)
  }
  return handler(quote, request, responseToolkit)
}

const removeAction = (quoteId, index) => ({
  href: claimsPath(quoteId, `claims/${index}/remove`),
  text: 'Remove',
  visuallyHiddenText: `claim ${index + 1}`
})

const claimRows = (quote) =>
  getClaims(quote).map((claim, index) => ({
    key: { text: `Claim ${index + 1}` },
    value: { text: claimLabel(claim) },
    actions: { items: [removeAction(quote.id, index)] }
  }))

const renderAddForm = (responseToolkit, quote, extras = {}) =>
  responseToolkit.view('standalone/spike-d/templates/claims-add', {
    layout: LAYOUT,
    pageTitle: 'Add a claim',
    quote,
    items: claimTypeItems(extras.claimType),
    backLink: claimsPath(quote.id, 'claims'),
    breadcrumbs: breadcrumbs(quote, 'Add a claim'),
    ...extras
  })

const listClaims = withQuote((quote, request, responseToolkit) =>
  responseToolkit.view('standalone/spike-d/templates/claims-list', {
    layout: LAYOUT,
    pageTitle: 'Claims you have added',
    quote,
    rows: claimRows(quote),
    backLink: navBack(quote.id, 'claims'),
    breadcrumbs: breadcrumbs(quote, 'Your claims')
  })
)

const submitClaims = withQuote((quote, request, responseToolkit) => {
  if (request.payload.action === ACTION_ADD) {
    return responseToolkit.redirect(claimsPath(quote.id, 'claims/add'))
  }
  markClaimsDone(quote)
  return responseToolkit.redirect(navNext(quote.id, 'claims'))
})

const showAddClaim = withQuote((quote, request, responseToolkit) =>
  renderAddForm(responseToolkit, quote)
)

const submitAddClaim = withQuote((quote, request, responseToolkit) => {
  const { value, errors, errorSummary } = validatePayload(
    claimsAddSchema,
    request.payload
  )
  if (errors) {
    return renderAddForm(responseToolkit, quote, {
      claimType: request.payload.claimType,
      errors,
      errorSummary,
      values: request.payload
    })
  }
  addClaim(quote, value)
  return responseToolkit.redirect(claimsPath(quote.id, 'claims'))
})

const removeClaimAt = withQuote((quote, request, responseToolkit) => {
  removeClaim(quote, Number(request.params.index))
  return responseToolkit.redirect(claimsPath(quote.id, 'claims'))
})

export function claimsRoutes() {
  const open = { auth: false }
  return [
    {
      method: 'GET',
      path: `${BASE}/{id}/claims`,
      options: open,
      handler: listClaims
    },
    {
      method: 'POST',
      path: `${BASE}/{id}/claims`,
      options: open,
      handler: submitClaims
    },
    {
      method: 'GET',
      path: `${BASE}/{id}/claims/add`,
      options: open,
      handler: showAddClaim
    },
    {
      method: 'POST',
      path: `${BASE}/{id}/claims/add`,
      options: open,
      handler: submitAddClaim
    },
    {
      method: 'GET',
      path: `${BASE}/{id}/claims/{index}/remove`,
      options: open,
      handler: removeClaimAt
    }
  ]
}
