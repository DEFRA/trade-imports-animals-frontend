import { COUNTRY_LABELS } from './stub.js'

/** Display label for an origin country code (undefined when the code is unknown). */
export const originLabel = (code) => COUNTRY_LABELS[code]

/** The origin country reference list as code→label select options, in reference-data order. */
export const originCountries = () =>
  Object.entries(COUNTRY_LABELS).map(([value, text]) => ({ value, text }))

/** The address country NAME list — the origin subset plus the United Kingdom for GB-based addresses. */
export const addressCountries = () => [
  'United Kingdom',
  ...Object.values(COUNTRY_LABELS)
]
