import { COUNTRY_LABELS } from './stub.js'
import { fetchCountries } from './client.js'
import { isRealMode } from '../mode.js'

let labels = { ...COUNTRY_LABELS }

export const prime = async () => {
  if (!isRealMode()) {
    return
  }
  const countries = await fetchCountries(['GBNAG_SPS_EX'])
  labels = Object.fromEntries(countries.map(({ code, name }) => [code, name]))
}

export const originLabel = (code) => labels[code]

export const originCountries = () =>
  Object.entries(labels).map(([value, text]) => ({ value, text }))

export const addressCountries = () => [
  'United Kingdom',
  ...Object.values(labels)
]

/** The ISO code for a country's display name (cv-011).
 *
 * Address forms collect a country by name; the address book keys on the code.
 * Returns undefined for a name with no code — "United Kingdom" is offered by
 * `addressCountries` but is not in GBNAG_SPS_EX — so callers send the name
 * through unchanged rather than dropping the trader's answer. */
export const countryCodeOf = (name) =>
  Object.entries(labels).find(([, label]) => label === name)?.[0]
