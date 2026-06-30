/**
 * Illustrative-only premium calculation, shared across prototype variants.
 *
 * Pure and deterministic, but the numbers are made up — this is a prototype,
 * not an underwriting engine. Returns an annual premium in whole pounds.
 */

const BASE_PREMIUM = 480
const DEFAULT_COVER_MULTIPLIER = 1
const VALUE_LOADING_RATE = 0.01
const NO_CLAIMS_DISCOUNT_PER_YEAR = 25
const PENALTY_POINT_LOADING = 15
const RECENT_CLAIMS_LOADING = 120
const MINIMUM_PREMIUM = 150
const HAD_CLAIMS_YES = 'yes'

const coverTypeMultiplier = {
  comprehensive: 1,
  'third-party-fire-theft': 0.85,
  'third-party': 0.7
}

const extraCost = {
  breakdown: 60,
  'courtesy-car': 35,
  legal: 25,
  windscreen: 20
}

export function calculatePremium(quote = {}) {
  const multiplier =
    coverTypeMultiplier[quote.coverType] ?? DEFAULT_COVER_MULTIPLIER

  const valueLoading = Math.round(
    (Number(quote.estimatedValue) || 0) * VALUE_LOADING_RATE
  )
  const noClaimsDiscount =
    (Number(quote.yearsNoClaims) || 0) * NO_CLAIMS_DISCOUNT_PER_YEAR
  const pointsLoading =
    (Number(quote.penaltyPoints) || 0) * PENALTY_POINT_LOADING
  const claimsLoading =
    quote.hadClaims === HAD_CLAIMS_YES ? RECENT_CLAIMS_LOADING : 0

  const extras = (quote.extras ?? []).reduce(
    (total, extra) => total + (extraCost[extra] ?? 0),
    0
  )

  const premium =
    Math.round((BASE_PREMIUM + valueLoading) * multiplier) +
    claimsLoading +
    pointsLoading -
    noClaimsDiscount +
    extras

  return Math.max(premium, MINIMUM_PREMIUM)
}
