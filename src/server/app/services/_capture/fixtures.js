import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const load = (file) =>
  JSON.parse(readFileSync(join(HERE, 'fixtures', file), 'utf8'))

// The single canned reference dataset — captured from real reference-data by
// capture.js and committed under fixtures/. The service stubs seed from here so
// stub data and the captured real data cannot drift.
export const countries = load('countries.json')
export const countriesOrigin = load('countries-origin.json')
export const portsOfEntry = load('ports-of-entry.json')

/** { code, name } rows for each SPS origin country in fixture order. */
export const countriesOriginEntries = () =>
  countriesOrigin.map(({ code, name }) => ({ code, name }))

/** Flat { code, name } rows rendered on the origin page (countries + subdivisions, sorted by name). */
export const originPageCountryEntries = () => {
  const subdivisions = countriesOrigin.flatMap(({ subDivisions = [] }) =>
    subDivisions.map(({ code, name }) => ({ code, name }))
  )
  return [...countriesOriginEntries(), ...subdivisions].sort((left, right) =>
    left.name.localeCompare(right.name)
  )
}
