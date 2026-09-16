import Boom from '@hapi/boom'
import { COUNTRY_LABELS } from './stub.js'
import { fetchCountries } from './client.js'
import { isStubMode } from '../../../common/services/mode.js'

let labels = { ...COUNTRY_LABELS }
let loaded = false

/** Load the country list from the reference-data service, once. Called
 * implicitly by every reader — the readers self-load on first use rather than
 * relying on a startup priming step, so an MDM outage at boot no longer stops
 * the pod from serving. In stub mode the seeded COUNTRY_LABELS play the role
 * of a loaded cache and this is a no-op. A prior failed load leaves `loaded`
 * false so the next reader retries; a success flips the flag and subsequent
 * calls short-circuit. */
export const ensureLoaded = async () => {
  if (isStubMode() || loaded) {
    return
  }
  try {
    const countries = await fetchCountries(['GBNAG_SPS_EX'])
    labels = Object.fromEntries(countries.map(({ code, name }) => [code, name]))
    loaded = true
  } catch (err) {
    throw Boom.serverUnavailable('Reference data unavailable', {
      dataset: 'countries',
      cause: err
    })
  }
}

/** Address forms offer "United Kingdom" ahead of the SPS origin list, but UK
 * is not in GBNAG_SPS_EX. Map it explicitly so writes stay ISO 3166-1 alpha-2
 * (D1) and read-back still renders the display name. */
const UNITED_KINGDOM = 'United Kingdom'
const UNITED_KINGDOM_CODE = 'GB'

export const originLabel = async (code) => {
  await ensureLoaded()
  return (
    labels[code] ?? (code === UNITED_KINGDOM_CODE ? UNITED_KINGDOM : undefined)
  )
}

export const originCountries = async () => {
  await ensureLoaded()
  return Object.entries(labels).map(([value, text]) => ({ value, text }))
}

export const addressCountries = async () => {
  await ensureLoaded()
  return [UNITED_KINGDOM, ...Object.values(labels)]
}

/** The ISO code for a country's display name (cv-011).
 *
 * Address forms collect a country by name; the address book keys on the code.
 * "United Kingdom" is offered by `addressCountries` but is not in GBNAG_SPS_EX,
 * so it is aliased to GB rather than falling through as a display name. */
export const countryCodeOf = async (name) => {
  await ensureLoaded()
  return name === UNITED_KINGDOM
    ? UNITED_KINGDOM_CODE
    : Object.entries(labels).find(([, label]) => label === name)?.[0]
}
