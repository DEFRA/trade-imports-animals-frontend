import { COUNTRY_LABELS } from './stub.js'
import { fetchCountries } from './client.js'
import { isStubMode } from '../../../common/services/mode.js'

let labels = { ...COUNTRY_LABELS }

export const prime = async () => {
  if (isStubMode()) {
    return
  }
  const countries = await fetchCountries(['GBNAG_SPS_EX'])
  labels = Object.fromEntries(countries.map(({ code, name }) => [code, name]))
}

/** Address forms offer "United Kingdom" ahead of the SPS origin list, but UK
 * is not in GBNAG_SPS_EX. Map it explicitly so writes stay ISO 3166-1 alpha-2
 * (D1) and read-back still renders the display name. */
const UNITED_KINGDOM = 'United Kingdom'
const UNITED_KINGDOM_CODE = 'GB'

// Readers are async even though the body is synchronous today — the signature
// is what callers depend on. Behaviour is unchanged in this commit; a
// follow-up wires each reader to await ensureLoaded so the load can be lazy
// and driven by the point of read.
export const originLabel = async (code) =>
  labels[code] ?? (code === UNITED_KINGDOM_CODE ? UNITED_KINGDOM : undefined)

export const originCountries = async () =>
  Object.entries(labels).map(([value, text]) => ({ value, text }))

export const addressCountries = async () => [
  UNITED_KINGDOM,
  ...Object.values(labels)
]

/** The ISO code for a country's display name (cv-011).
 *
 * Address forms collect a country by name; the address book keys on the code.
 * "United Kingdom" is offered by `addressCountries` but is not in GBNAG_SPS_EX,
 * so it is aliased to GB rather than falling through as a display name. */
export const countryCodeOf = async (name) =>
  name === UNITED_KINGDOM
    ? UNITED_KINGDOM_CODE
    : Object.entries(labels).find(([, label]) => label === name)?.[0]
