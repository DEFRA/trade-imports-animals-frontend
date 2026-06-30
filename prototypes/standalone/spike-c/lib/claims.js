import { updateQuote } from './store.js'
import { claimTypeOptions, claimTypeLabel } from './quote.js'

/**
 * The "add another" claims sub-loop. Driving history asks whether the driver has
 * had a claim (the conditional); if yes, they drop into this loop and add 0..N
 * claims one at a time, returning to a list page between each, before rejoining
 * the main flow. Each claim is an item in quote.claims.
 */

export const getClaims = (quote) => quote.claims ?? []

export function claimTypeItems(selected) {
  return claimTypeOptions.map((option) => ({
    value: option.value,
    text: option.text,
    checked: option.value === selected
  }))
}

export function addClaim(quote, payload) {
  return updateQuote(quote.id, {
    claims: [
      ...getClaims(quote),
      { claimType: payload.claimType, claimAmount: payload.claimAmount }
    ]
  })
}

export function removeClaim(quote, index) {
  return updateQuote(quote.id, {
    claims: getClaims(quote).filter((_, position) => position !== index)
  })
}

/** Mark the loop finished (the driver chose to continue out of it). */
export function markClaimsDone(quote) {
  return updateQuote(quote.id, { claimsDone: true })
}

export function claimLabel(claim) {
  const type = claimTypeLabel(claim.claimType)
  return claim.claimAmount ? `${type} — £${claim.claimAmount}` : type
}
