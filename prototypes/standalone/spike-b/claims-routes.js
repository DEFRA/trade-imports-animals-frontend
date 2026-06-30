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

// Optional schema for the add-a-claim form — today just the currency amount.
const claimsAddSchema = currencySchema({
  name: 'claimAmount',
  enterMessage: 'Enter the approximate claim amount',
  formatMessage:
    'Claim amount must be a whole number of pounds greater than 0, like 1500'
})

const CLAIMS_LIST_VIEW = 'standalone/spike-b/templates/claims-list'
const CLAIMS_ADD_VIEW = 'standalone/spike-b/templates/claims-add'

const claimsPath = (id, suffix) => `${BASE}/${id}/${suffix}`

const withQuote = (handler) => (request, responseToolkit) => {
  const quote = findQuote(request.params.id)
  if (!quote) {
    return responseToolkit.redirect(BASE)
  }
  return handler(request, responseToolkit, quote)
}

const claimsListRows = (quote) =>
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

const addClaimView = (quote, extras = {}) => {
  const { selectedClaimType, ...rest } = extras
  return {
    layout: LAYOUT,
    pageTitle: 'Add a claim',
    quote,
    items: claimTypeItems(selectedClaimType),
    backLink: claimsPath(quote.id, 'claims'),
    breadcrumbs: breadcrumbs(quote, 'Add a claim'),
    ...rest
  }
}

const renderClaimsList = (request, responseToolkit, quote) =>
  responseToolkit.view(CLAIMS_LIST_VIEW, {
    layout: LAYOUT,
    pageTitle: 'Claims you have added',
    quote,
    rows: claimsListRows(quote),
    backLink: navBack(quote.id, 'claims'),
    breadcrumbs: breadcrumbs(quote, 'Your claims')
  })

const postClaimsAction = (request, responseToolkit, quote) => {
  if (request.payload.action === 'add') {
    return responseToolkit.redirect(claimsPath(quote.id, 'claims/add'))
  }
  markClaimsDone(quote)
  return responseToolkit.redirect(navNext(quote.id, 'claims'))
}

const renderAddClaimForm = (request, responseToolkit, quote) =>
  responseToolkit.view(CLAIMS_ADD_VIEW, addClaimView(quote))

const postAddClaim = (request, responseToolkit, quote) => {
  const { value, errors, errorSummary } = validatePayload(
    claimsAddSchema,
    request.payload
  )
  if (errors) {
    return responseToolkit.view(
      CLAIMS_ADD_VIEW,
      addClaimView(quote, {
        selectedClaimType: request.payload.claimType,
        errors,
        errorSummary,
        values: request.payload
      })
    )
  }
  addClaim(quote, value)
  return responseToolkit.redirect(claimsPath(quote.id, 'claims'))
}

const getRemoveClaim = (request, responseToolkit, quote) => {
  removeClaim(quote, Number(request.params.index))
  return responseToolkit.redirect(claimsPath(quote.id, 'claims'))
}

export function claimsRoutes() {
  const open = { auth: false }
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
      handler: withQuote(postClaimsAction)
    },
    {
      method: 'GET',
      path: `${BASE}/{id}/claims/add`,
      options: open,
      handler: withQuote(renderAddClaimForm)
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
      handler: withQuote(getRemoveClaim)
    }
  ]
}
