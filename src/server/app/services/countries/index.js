import Boom from '@hapi/boom'
import { COUNTRY_LABELS } from './stub.js'
import { fetchCountries } from './client.js'
import { isStubMode } from '../../../common/services/mode.js'

let labels = { ...COUNTRY_LABELS }
let loaded = false

/** Load real reference data. Called once at startup (non-fatal — the plugin's
 * register catches to keep the service coming up when MDM is unavailable).
 * Stub mode is a no-op — the module-scope labels are seeded from the stub so
 * the readers can serve without any load. */
export const prime = async () => {
  if (isStubMode()) {
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

/** In real mode a reader called before prime() succeeded has nothing real to
 * serve — falling back silently to the seeded stub would let a page render
 * with the wrong countries. Throw instead, so catchAll renders the error
 * page (see server/common/helpers/errors.js). Stub mode always succeeds. */
const assertLoaded = () => {
  if (!isStubMode() && !loaded) {
    throw Boom.serverUnavailable('Reference data unavailable', {
      dataset: 'countries'
    })
  }
}

export const originLabel = (code) => {
  assertLoaded()
  return (
    labels[code] ?? (code === UNITED_KINGDOM_CODE ? UNITED_KINGDOM : undefined)
  )
}

export const originCountries = () => {
  assertLoaded()
  return Object.entries(labels).map(([value, text]) => ({ value, text }))
}

export const addressCountries = () => {
  assertLoaded()
  return [UNITED_KINGDOM, ...Object.values(labels)]
}

/** The ISO code for a country's display name (cv-011).
 *
 * Address forms collect a country by name; the address book keys on the code.
 * "United Kingdom" is offered by `addressCountries` but is not in GBNAG_SPS_EX,
 * so it is aliased to GB rather than falling through as a display name. */
export const countryCodeOf = (name) => {
  assertLoaded()
  return name === UNITED_KINGDOM
    ? UNITED_KINGDOM_CODE
    : Object.entries(labels).find(([, label]) => label === name)?.[0]
}
