import {
  coverTypeOptions,
  extrasOptions,
  coverTypeLabel,
  claimTypeLabel,
  countryLabel,
  extrasLabels,
  formatDateOfBirth
} from '../quote.js'
import {
  addonByValue,
  addonComplete,
  allSelectedAddonsComplete
} from '../addons/index.js'
import {
  currencySchema,
  dobSchema,
  emailSchema,
  integerYearsSchema,
  phoneSchema,
  requiredTextSchema,
  vehicleYearSchema
} from '../validate/index.js'

const PHONE_EXAMPLES =
  'Enter a telephone number, like 01632 960 001, 07700 900 982 or +44 808 157 0192'

/**
 * The questions that make up a car insurance quote, defined once and reused by
 * every variant. Each section owns:
 *   - how its form payload maps to a quote patch (collect)
 *   - whether it has been answered (isComplete) — drives task-list statuses
 *   - how it renders on the check-answers page (rows)
 *   - optionally, whether it applies at all (appliesWhen) — conditional questions
 *
 * Variants differ only in how they navigate between these sections. A section
 * with no `appliesWhen` always applies; one with `appliesWhen` only applies when
 * the predicate is true for the current answers (e.g. claim details only appear
 * once you say you have had a claim).
 */

/** Checkboxes post a single value as a string and many as an array. */
function toArray(value) {
  if (value === undefined) {
    return []
  }
  return Array.isArray(value) ? value : [value]
}

export const sections = [
  {
    // Pre-hub gate: the user must enter a valid email before they reach the
    // task-list hub. The variant owns the routing for this; sectionRoutes /
    // hubItems skip sections flagged `preHub`.
    slug: 'email',
    title: 'Give us your email to begin',
    preHub: true,
    schema: emailSchema({ required: true }),
    collect: (payload) => ({ email: payload.email }),
    isComplete: (quote) => Boolean(quote.email),
    rows: (quote) => [{ key: 'Email', value: quote.email ?? 'Not provided' }]
  },
  {
    slug: 'about-you',
    title: 'About you',
    // Full name is mandatory at save; DOB and phone are optional — the user can
    // save the page with just the name and come back later. When DOB or phone
    // is filled the canonical GDS rules still apply (real date / 17-120 age /
    // lenient phone format).
    schema: requiredTextSchema({
      name: 'fullName',
      enterMessage: 'Enter your full name'
    })
      .concat(dobSchema('dateOfBirth', 'Date of birth', { required: false }))
      .concat(
        phoneSchema({
          name: 'phone',
          enterMessage: 'Enter a UK telephone number',
          formatMessage: PHONE_EXAMPLES,
          required: false
        })
      ),
    collect: (payload) => {
      // Called twice — once on success (post-Joi `value`, day already a
      // Number) and once via the error-re-render path in section-controller
      // (raw `request.payload` strings). The presence check spans both shapes
      // so we keep typed primitives when validated and preserve the user's
      // typed strings when re-rendering after a failed submit.
      const day = payload['dateOfBirth-day']
      const month = payload['dateOfBirth-month']
      const year = payload['dateOfBirth-year']
      const anyPart = [day, month, year].some(
        (part) => part !== undefined && String(part).trim() !== ''
      )
      const dateOfBirth = anyPart ? { day, month, year } : undefined
      return {
        fullName: payload.fullName,
        preferredName: payload.preferredName,
        phone: payload.phone,
        postcode: payload.postcode,
        country: payload.country,
        dateOfBirth
      }
    },
    isComplete: (quote) => Boolean(quote.fullName),
    rows: (quote) => [
      { key: 'Name', value: quote.fullName ?? 'Not provided' },
      { key: 'Preferred name', value: quote.preferredName ?? 'Not provided' },
      { key: 'Telephone', value: quote.phone ?? 'Not provided' },
      { key: 'Postcode', value: quote.postcode ?? 'Not provided' },
      { key: 'Country', value: countryLabel(quote.country) },
      { key: 'Date of birth', value: formatDateOfBirth(quote.dateOfBirth) }
    ]
  },
  {
    slug: 'your-vehicle',
    title: 'Your vehicle',
    schema: vehicleYearSchema({
      name: 'year',
      enterMessage: 'Enter the year your vehicle was made',
      noun: 'Year of manufacture',
      required: false
    }).concat(
      currencySchema({
        name: 'estimatedValue',
        enterMessage: 'Enter the estimated value',
        formatMessage:
          'Estimated value must be a whole number of pounds greater than 0, like 5000'
      })
    ),
    collect: (payload) => ({
      registration: payload.registration,
      make: payload.make,
      model: payload.model,
      year: payload.year,
      estimatedValue: payload.estimatedValue
    }),
    isComplete: (quote) => Boolean(quote.registration),
    rows: (quote) => [
      { key: 'Registration', value: quote.registration ?? 'Not provided' },
      {
        key: 'Vehicle',
        value:
          [quote.make, quote.model, quote.year].filter(Boolean).join(' ') ||
          'Not provided'
      },
      {
        key: 'Estimated value',
        value: quote.estimatedValue
          ? `£${quote.estimatedValue}`
          : 'Not provided'
      }
    ]
  },
  {
    slug: 'driving-history',
    title: 'Driving history',
    schema: integerYearsSchema({
      name: 'yearsNoClaims',
      enterMessage: 'Enter how many years of no-claims discount you have',
      noun: 'Years of no-claims discount',
      min: 0,
      max: 99,
      required: false
    }).concat(
      integerYearsSchema({
        name: 'penaltyPoints',
        enterMessage: 'Enter how many penalty points you have',
        noun: 'Penalty points',
        min: 0,
        max: 12,
        required: false
      })
    ),
    collect: (payload) => {
      const patch = {
        yearsNoClaims: payload.yearsNoClaims,
        hadClaims: payload.hadClaims,
        penaltyPoints: payload.penaltyPoints
      }
      // Switching away from "yes" makes the claims sub-loop no longer apply —
      // clear its answers so they cannot linger in the store or reappear.
      if (payload.hadClaims !== 'yes') {
        patch.claims = []
        patch.claimsDone = false
      }
      return patch
    },
    isComplete: (quote) => Boolean(quote.hadClaims),
    rows: (quote) => [
      { key: 'Years no claims', value: quote.yearsNoClaims ?? 'Not provided' },
      { key: 'Recent claims', value: quote.hadClaims === 'yes' ? 'Yes' : 'No' },
      { key: 'Penalty points', value: quote.penaltyPoints ?? '0' }
    ]
  },
  {
    // Conditional sub-loop: applies when the driver said they have had a claim.
    // Its pages are the add-another loop (shared/claims-routes.js), not the
    // generic section page, so it is flagged `loop` and skipped by sectionRoutes.
    slug: 'claims',
    title: 'Your claims',
    loop: true,
    appliesWhen: (quote) => quote.hadClaims === 'yes',
    isComplete: (quote) => quote.claimsDone === true,
    rows: (quote) => {
      const claims = quote.claims ?? []
      if (!claims.length) {
        return [{ key: 'Claims', value: 'None added' }]
      }
      return claims.map((claim, index) => ({
        key: `Claim ${index + 1}`,
        value:
          claimTypeLabel(claim.claimType) +
          (claim.claimAmount ? ` — £${claim.claimAmount}` : '')
      }))
    }
  },
  {
    slug: 'cover-type',
    title: 'Choose your cover',
    schema: currencySchema({
      name: 'excessAmount',
      enterMessage: 'Enter the voluntary excess amount',
      formatMessage:
        'Voluntary excess must be a whole number of pounds greater than 0, like 250'
    }),
    collect: (payload) => ({
      coverType: payload.coverType,
      voluntaryExcess: payload.voluntaryExcess,
      excessAmount: payload.excessAmount
    }),
    isComplete: (quote) => Boolean(quote.coverType),
    items: (quote) =>
      coverTypeOptions.map((option) => ({
        value: option.value,
        text: option.text,
        hint: { text: option.hint },
        checked: quote.coverType === option.value
      })),
    rows: (quote) => [
      { key: 'Cover', value: coverTypeLabel(quote.coverType) },
      {
        key: 'Voluntary excess',
        value:
          quote.voluntaryExcess === 'yes'
            ? `£${quote.excessAmount || '0'}`
            : 'None'
      }
    ]
  },
  {
    slug: 'optional-extras',
    title: 'Optional extras',
    collect: (payload) => ({ extras: toArray(payload.extras) }),
    isComplete: (quote) => quote.extras !== undefined,
    items: (quote) =>
      extrasOptions.map((option) => ({
        value: option.value,
        text: option.text,
        checked: (quote.extras ?? []).includes(option.value)
      })),
    rows: (quote) => {
      const labels = extrasLabels(quote.extras)
      return [
        {
          key: 'Optional extras',
          value: labels.length ? labels.join(', ') : 'None'
        }
      ]
    }
  },
  {
    // Subtasks fan-out: pick 0-to-N add-ons, each with its own mini-journey.
    // Its pages live in shared/addons-routes.js, so sectionRoutes skips it.
    slug: 'addons',
    title: 'Add to your policy',
    subtasks: true,
    isComplete: (quote) =>
      quote.selectedAddons !== undefined && allSelectedAddonsComplete(quote),
    rows: (quote) => {
      const selected = quote.selectedAddons ?? []
      if (!selected.length) {
        return [{ key: 'Added to policy', value: 'None' }]
      }
      return selected.map((value) => ({
        key: addonByValue.get(value).title,
        value: addonComplete(quote, value) ? 'Added' : 'Incomplete'
      }))
    }
  }
]
