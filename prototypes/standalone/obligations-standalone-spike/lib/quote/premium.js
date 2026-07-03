/**
 * Illustrative-only premium formula, parity-pinned to the pound against
 * spike-a/lib/premium.js (parity-facts.json §premium — same constants,
 * same rounding, same floor). Pure and deterministic; invoked ONLY by the
 * orchestrator's system quote handler (DEF-16/EVAL-8), never by a route.
 * Answers arrive keyed by obligation NAME; add-ons never affect the price.
 */

const BASE_PREMIUM = 480
const DEFAULT_MULTIPLIER = 1
const VALUE_LOADING_RATE = 0.01
const NO_CLAIMS_DISCOUNT_PER_YEAR = 25
const PENALTY_POINT_LOADING = 15
const RECENT_CLAIMS_LOADING = 120
const MINIMUM_PREMIUM = 150
const CLAIMS_ANSWER_YES = 'yes'

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

/** Annual premium in whole pounds; happily prices a half-empty journey. */
export const calculatePremium = (answers = {}) => {
  const multiplier =
    coverTypeMultiplier[answers.coverType] ?? DEFAULT_MULTIPLIER

  const valueLoading = Math.round(
    (Number(answers.estimatedValue) || 0) * VALUE_LOADING_RATE
  )
  const noClaimsDiscount =
    (Number(answers.yearsNoClaims) || 0) * NO_CLAIMS_DISCOUNT_PER_YEAR
  const pointsLoading =
    (Number(answers.penaltyPoints) || 0) * PENALTY_POINT_LOADING
  const claimsLoading =
    answers.hadClaims === CLAIMS_ANSWER_YES ? RECENT_CLAIMS_LOADING : 0

  const extras = (answers.extras ?? []).reduce(
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
