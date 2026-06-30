import { findQuote } from '../lib/store.js'
import { currencySchema, validatePayload } from '../lib/validate/index.js'
import { addClaim, removeClaim, markClaimsDone } from '../lib/claims.js'
import { BASE, navNext } from '../journey/index.js'
import { claimsPath, addClaimView, TEMPLATE_CLAIMS_ADD } from './view-models.js'

const ACTION_ADD = 'add'

// Optional schema for the add-a-claim form — today just the currency amount.
const claimsAddSchema = currencySchema({
  name: 'claimAmount',
  enterMessage: 'Enter the approximate claim amount',
  formatMessage:
    'Claim amount must be a whole number of pounds greater than 0, like 1500'
})

// Resolve the quote or short-circuit to the journey base.
export const withQuote = (handler) => (request, toolkit) => {
  const quote = findQuote(request.params.id)
  if (!quote) {
    return toolkit.redirect(BASE)
  }
  return handler(quote, request, toolkit)
}

export const postClaimsList = (quote, request, toolkit) => {
  if (request.payload.action === ACTION_ADD) {
    return toolkit.redirect(claimsPath(quote.id, 'claims/add'))
  }
  markClaimsDone(quote)
  return toolkit.redirect(navNext(quote.id, 'claims'))
}

export const postAddClaim = (quote, request, toolkit) => {
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

export const postRemoveClaim = (quote, request, toolkit) => {
  removeClaim(quote, Number(request.params.index))
  return toolkit.redirect(claimsPath(quote.id, 'claims'))
}
