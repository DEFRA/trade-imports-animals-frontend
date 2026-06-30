import { findQuote } from '../lib/store.js'
import { currencySchema, validatePayload } from '../lib/validate/index.js'
import { addClaim, removeClaim, markClaimsDone } from '../lib/claims.js'
import {
  BASE,
  LAYOUT,
  breadcrumbs,
  navBack,
  navNext
} from '../journey/index.js'
import {
  CLAIMS_LIST_VIEW,
  CLAIMS_ADD_VIEW,
  claimsPath,
  claimsListRows,
  addClaimView
} from './view-models.js'

// Optional schema for the add-a-claim form — today just the currency amount.
const claimsAddSchema = currencySchema({
  name: 'claimAmount',
  enterMessage: 'Enter the approximate claim amount',
  formatMessage:
    'Claim amount must be a whole number of pounds greater than 0, like 1500'
})

export const withQuote = (handler) => (request, responseToolkit) => {
  const quote = findQuote(request.params.id)
  if (!quote) {
    return responseToolkit.redirect(BASE)
  }
  return handler(request, responseToolkit, quote)
}

export const renderClaimsList = (request, responseToolkit, quote) =>
  responseToolkit.view(CLAIMS_LIST_VIEW, {
    layout: LAYOUT,
    pageTitle: 'Claims you have added',
    quote,
    rows: claimsListRows(quote),
    backLink: navBack(quote.id, 'claims'),
    breadcrumbs: breadcrumbs(quote, 'Your claims')
  })

export const postClaimsAction = (request, responseToolkit, quote) => {
  if (request.payload.action === 'add') {
    return responseToolkit.redirect(claimsPath(quote.id, 'claims/add'))
  }
  markClaimsDone(quote)
  return responseToolkit.redirect(navNext(quote.id, 'claims'))
}

export const renderAddClaimForm = (request, responseToolkit, quote) =>
  responseToolkit.view(CLAIMS_ADD_VIEW, addClaimView(quote))

export const postAddClaim = (request, responseToolkit, quote) => {
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

export const getRemoveClaim = (request, responseToolkit, quote) => {
  removeClaim(quote, Number(request.params.index))
  return responseToolkit.redirect(claimsPath(quote.id, 'claims'))
}
