import {
  coverTypeOptions,
  extrasOptions,
  coverTypeLabel,
  claimTypeLabel,
  countryLabel,
  extrasLabels,
  formatDateOfBirth
} from './quote.js'
import {
  addonByValue,
  addonComplete,
  allSelectedAddonsComplete
} from './addons.js'
import {
  dobSchema,
  integerYearsSchema,
  phoneSchema,
  vehicleYearSchema
} from './validate.js'

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
    slug: 'about-you',
    title: 'About you',
    // Both DOB and phone are optional in the prototype — the user can save the
    // page blank and come back later. When they do fill them in, the canonical
    // GDS rules still apply (real date / 17-120 age / lenient phone format).
    schema: dobSchema('dateOfBirth', 'Date of birth', {
      required: false
    }).concat(
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
        email: payload.email,
        phone: payload.phone,
        postcode: payload.postcode,
        country: payload.country,
        dateOfBirth
      }
    },
    isComplete: (quote) => Boolean(quote.fullName),
    rows: (quote) => [
      { key: 'Name', value: quote.fullName ?? 'Not provided' },
      { key: 'Email', value: quote.email ?? 'Not provided' },
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
      noun: 'Year of manufacture'
    }),
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
      max: 99
    }),
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

export const sectionBySlug = new Map(sections.map((s) => [s.slug, s]))

/** Sections that own their own routes (loops, subtask fan-outs). */
export function hasOwnRoutes(section) {
  return Boolean(section.loop || section.subtasks)
}

/** Whether a section applies for the current answers (no predicate = always). */
export function applies(section, quote) {
  return !section.appliesWhen || section.appliesWhen(quote)
}

/** The sections that currently apply, in order — the live journey. */
export function applicableSections(quote) {
  return sections.filter((section) => applies(section, quote))
}

export function allSectionsComplete(quote) {
  return applicableSections(quote).every((section) => section.isComplete(quote))
}

/** Flatten every applicable section's rows for the check-your-answers list. */
export function answerRows(quote) {
  return applicableSections(quote).flatMap((section) =>
    section.rows(quote).map((row) => ({ ...row, slug: section.slug }))
  )
}
