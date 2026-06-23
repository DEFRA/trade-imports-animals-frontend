import {
  coverTypeOptions,
  extrasOptions,
  coverTypeLabel,
  claimTypeLabel,
  extrasLabels,
  formatDateOfBirth
} from './quote.js'

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
    collect: (payload) => ({
      fullName: payload.fullName,
      email: payload.email,
      dateOfBirth: {
        day: payload['dateOfBirth-day'],
        month: payload['dateOfBirth-month'],
        year: payload['dateOfBirth-year']
      }
    }),
    isComplete: (quote) => Boolean(quote.fullName),
    rows: (quote) => [
      { key: 'Name', value: quote.fullName ?? 'Not provided' },
      { key: 'Email', value: quote.email ?? 'Not provided' },
      { key: 'Date of birth', value: formatDateOfBirth(quote.dateOfBirth) }
    ]
  },
  {
    slug: 'your-vehicle',
    title: 'Your vehicle',
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
    collect: (payload) => ({
      yearsNoClaims: payload.yearsNoClaims,
      hadClaims: payload.hadClaims,
      penaltyPoints: payload.penaltyPoints
    }),
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
    collect: (payload) => ({ coverType: payload.coverType }),
    isComplete: (quote) => Boolean(quote.coverType),
    items: (quote) =>
      coverTypeOptions.map((option) => ({
        value: option.value,
        text: option.text,
        hint: { text: option.hint },
        checked: quote.coverType === option.value
      })),
    rows: (quote) => [{ key: 'Cover', value: coverTypeLabel(quote.coverType) }]
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
  }
]

export const sectionBySlug = new Map(sections.map((s) => [s.slug, s]))

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
