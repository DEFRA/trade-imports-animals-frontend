/**
 * Static reference data + formatting helpers for the car insurance quote model,
 * shared across every prototype variant. No persistence here.
 */

export const coverTypeOptions = [
  {
    value: 'comprehensive',
    text: 'Comprehensive',
    hint: 'Covers you, your car and other people'
  },
  {
    value: 'third-party-fire-theft',
    text: 'Third party, fire and theft',
    hint: 'Covers other people, plus fire and theft of your car'
  },
  {
    value: 'third-party',
    text: 'Third party only',
    hint: 'Covers other people only'
  }
]

export const extrasOptions = [
  { value: 'breakdown', text: 'Breakdown cover' },
  { value: 'courtesy-car', text: 'Courtesy car' },
  { value: 'legal', text: 'Motor legal protection' },
  { value: 'windscreen', text: 'Windscreen cover' }
]

export const claimTypeOptions = [
  { value: 'accident', text: 'Accident' },
  { value: 'theft', text: 'Theft' },
  { value: 'windscreen', text: 'Windscreen' },
  { value: 'other', text: 'Something else' }
]

const coverTypeText = new Map(
  coverTypeOptions.map((option) => [option.value, option.text])
)
const extrasText = new Map(
  extrasOptions.map((option) => [option.value, option.text])
)
const claimTypeText = new Map(
  claimTypeOptions.map((option) => [option.value, option.text])
)

export function coverTypeLabel(value) {
  return coverTypeText.get(value) ?? 'Not provided'
}

export function claimTypeLabel(value) {
  return claimTypeText.get(value) ?? 'Not provided'
}

export function extrasLabels(values = []) {
  return values.map((value) => extrasText.get(value) ?? value)
}

export function formatDateOfBirth(dob) {
  if (!dob || !dob.day) {
    return 'Not provided'
  }
  return `${dob.day}/${dob.month}/${dob.year}`
}

/** Build a human-readable reference once a quote is confirmed, e.g. CI-3F9A2B. */
export function makeReference(id) {
  return `CI-${id.replace(/-/g, '').slice(0, 6).toUpperCase()}`
}
