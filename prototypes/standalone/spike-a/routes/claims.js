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

const CLAIMS_LIST_TEMPLATE = 'standalone/spike-a/templates/claims-list'
const ADD_CLAIM_TEMPLATE = 'standalone/spike-a/templates/claims-add'
const ADD_CLAIM_TITLE = 'Add a claim'

// Optional schema for the add-a-claim form — today just the currency amount.
const claimsAddSchema = currencySchema({
  name: 'claimAmount',
  enterMessage: 'Enter the approximate claim amount',
  formatMessage:
    'Claim amount must be a whole number of pounds greater than 0, like 1500'
})

const claimPath = (id, suffix) => `${BASE}/${id}/${suffix}`

// Load the quote once and short-circuit to BASE when it is missing, so each
// handler receives a resolved quote and never repeats the guard.
const withQuote = (handler) => (request, h) => {
  const quote = findQuote(request.params.id)
  return quote ? handler(quote, request, h) : h.redirect(BASE)
}

const buildClaimRows = (quote) =>
  getClaims(quote).map((claim, index) => ({
    key: { text: `Claim ${index + 1}` },
    value: { text: claimLabel(claim) },
    actions: {
      items: [
        {
          href: claimPath(quote.id, `claims/${index}/remove`),
          text: 'Remove',
          visuallyHiddenText: `claim ${index + 1}`
        }
      ]
    }
  }))

const claimsAddView = (quote, extras = {}) => ({
  layout: LAYOUT,
  pageTitle: ADD_CLAIM_TITLE,
  quote,
  items: claimTypeItems(extras.values?.claimType),
  backLink: claimPath(quote.id, 'claims'),
  breadcrumbs: breadcrumbs(quote, ADD_CLAIM_TITLE),
  ...extras
})

const getClaimsList = (quote, request, h) =>
  h.view(CLAIMS_LIST_TEMPLATE, {
    layout: LAYOUT,
    pageTitle: 'Claims you have added',
    quote,
    rows: buildClaimRows(quote),
    backLink: navBack(quote.id, 'claims'),
    breadcrumbs: breadcrumbs(quote, 'Your claims')
  })

const postClaimsList = (quote, request, h) => {
  if (request.payload.action === 'add') {
    return h.redirect(claimPath(quote.id, 'claims/add'))
  }
  markClaimsDone(quote)
  return h.redirect(navNext(quote.id, 'claims'))
}

const getClaimsAddForm = (quote, request, h) =>
  h.view(ADD_CLAIM_TEMPLATE, claimsAddView(quote))

const postClaimsAddForm = (quote, request, h) => {
  const { value, errors, errorSummary } = validatePayload(
    claimsAddSchema,
    request.payload
  )
  if (errors) {
    return h.view(
      ADD_CLAIM_TEMPLATE,
      claimsAddView(quote, { errors, errorSummary, values: request.payload })
    )
  }
  addClaim(quote, value)
  return h.redirect(claimPath(quote.id, 'claims'))
}

const getRemoveClaim = (quote, request, h) => {
  removeClaim(quote, Number(request.params.index))
  return h.redirect(claimPath(quote.id, 'claims'))
}

export function claimsRoutes() {
  const open = { auth: false }
  return [
    {
      method: 'GET',
      path: `${BASE}/{id}/claims`,
      options: open,
      handler: withQuote(getClaimsList)
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
      handler: withQuote(getClaimsAddForm)
    },
    {
      method: 'POST',
      path: `${BASE}/{id}/claims/add`,
      options: open,
      handler: withQuote(postClaimsAddForm)
    },
    {
      method: 'GET',
      path: `${BASE}/{id}/claims/{index}/remove`,
      options: open,
      handler: withQuote(getRemoveClaim)
    }
  ]
}
