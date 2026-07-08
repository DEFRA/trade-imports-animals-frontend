import { COUNTRY_LABELS } from './stub.js'

export const originLabel = (code) => COUNTRY_LABELS[code]

export const originCountries = () =>
  Object.entries(COUNTRY_LABELS).map(([value, text]) => ({ value, text }))

export const addressCountries = () => [
  'United Kingdom',
  ...Object.values(COUNTRY_LABELS)
]
