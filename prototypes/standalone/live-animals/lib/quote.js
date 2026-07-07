const BASE_PREMIUM = 480
const VALUE_LOADING_RATE = 0.01
const NO_CLAIMS_DISCOUNT_PER_YEAR = 25
const PENALTY_POINT_LOADING = 15
const RECENT_CLAIMS_LOADING = 120
const MINIMUM_PREMIUM = 150

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
  const multiplier = coverTypeMultiplier[answers.coverType] ?? 1
  const valueLoading = Math.round(
    (Number(answers.estimatedValue) || 0) * VALUE_LOADING_RATE
  )
  const noClaimsDiscount =
    (Number(answers.yearsNoClaims) || 0) * NO_CLAIMS_DISCOUNT_PER_YEAR
  const pointsLoading =
    (Number(answers.penaltyPoints) || 0) * PENALTY_POINT_LOADING
  const claimsLoading = answers.hadClaims === 'yes' ? RECENT_CLAIMS_LOADING : 0
  const extras = []
    .concat(answers.extras ?? [])
    .reduce((total, extra) => total + (extraCost[extra] ?? 0), 0)
  const premium =
    Math.round((BASE_PREMIUM + valueLoading) * multiplier) +
    claimsLoading +
    pointsLoading -
    noClaimsDiscount +
    extras
  return Math.max(premium, MINIMUM_PREMIUM)
}

export const makeReference = (journeyId) =>
  `CI-${journeyId.replace(/-/g, '').slice(0, 6).toUpperCase()}`
