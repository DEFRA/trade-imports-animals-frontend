import Boom from '@hapi/boom'
import {
  ADDRESS_BOOK_COUNTRY_LABELS,
  COUNTRY_LABELS,
  COUNTRY_SUBDIVISIONS
} from './stub.js'
import { fetchCountries } from './client.js'
import { isStubMode } from '../../../common/services/mode.js'

let labels = { ...COUNTRY_LABELS }
let subdivisionLabels = { ...COUNTRY_SUBDIVISIONS.labels }
let subdivisionToParent = { ...COUNTRY_SUBDIVISIONS.parents }
let loaded = false
let addressBookLabels = { ...ADDRESS_BOOK_COUNTRY_LABELS }
let addressBookLoaded = false

const indexSubDivisions = (countries) => {
  const nextSubdivisionLabels = {}
  const nextSubdivisionToParent = {}

  for (const country of countries) {
    for (const subdivision of country.subDivisions ?? []) {
      nextSubdivisionLabels[subdivision.code] = subdivision.name
      nextSubdivisionToParent[subdivision.code] = country.code
    }
  }

  subdivisionLabels = nextSubdivisionLabels
  subdivisionToParent = nextSubdivisionToParent
}

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
    indexSubDivisions(countries)
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

export const isSubdivisionCode = (code) =>
  code != null && Object.hasOwn(subdivisionLabels, code)

export const parentCountryCode = (code) => subdivisionToParent[code] ?? code

export const originLabel = async (code) => {
  await ensureLoaded()
  if (code == null || code === '') {
    return undefined
  }
  if (isSubdivisionCode(code)) {
    return subdivisionLabels[code]
  }
  return (
    labels[code] ?? (code === UNITED_KINGDOM_CODE ? UNITED_KINGDOM : undefined)
  )
}

export const originDisplayLabel = async (code) => {
  await ensureLoaded()
  if (code == null || code === '') {
    return ''
  }
  if (isSubdivisionCode(code)) {
    const parentCode = parentCountryCode(code)
    const subdivisionName = subdivisionLabels[code]
    const parentName = labels[parentCode]
    return parentName ? `${subdivisionName} (${parentName})` : subdivisionName
  }
  return (await originLabel(code)) ?? code
}

export const originCountries = async () => {
  await ensureLoaded()
  return Object.entries(labels).map(([value, text]) => ({ value, text }))
}

/** Flat country and subdivision entries for the origin page only. */
export const originCountryOptions = async () => {
  await ensureLoaded()
  const countryOptions = Object.entries(labels).map(([value, text]) => ({
    value,
    text
  }))
  const subdivisionOptions = Object.entries(subdivisionLabels).map(
    ([value, text]) => ({ value, text })
  )
  return [...countryOptions, ...subdivisionOptions].sort((left, right) =>
    left.text.localeCompare(right.text)
  )
}

export const addressCountries = async () => {
  await ensureLoaded()
  return [UNITED_KINGDOM, ...Object.values(labels)]
}

/** Kept apart from `ensureLoaded` so the origin readers keep the narrower SPS
 * list; the address book validates against the unfiltered one. */
const ensureAddressBookCountriesLoaded = async () => {
  if (isStubMode() || addressBookLoaded) {
    return
  }
  try {
    const countries = await fetchCountries()
    addressBookLabels = Object.fromEntries(
      countries.map(({ code, name }) => [code, name])
    )
    addressBookLoaded = true
  } catch (err) {
    throw Boom.serverUnavailable('Reference data unavailable', {
      dataset: 'countries',
      cause: err
    })
  }
}

export const addressBookCountries = async () => {
  await ensureAddressBookCountriesLoaded()
  return [
    { code: UNITED_KINGDOM_CODE, name: UNITED_KINGDOM },
    ...Object.entries(addressBookLabels)
      .filter(([code]) => code !== UNITED_KINGDOM_CODE)
      .map(([code, name]) => ({ code, name }))
  ]
}

/** Falls back to the code. */
export const addressBookCountryName = async (code) =>
  (await addressBookCountries()).find((option) => option.code === code)?.name ??
  code

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
