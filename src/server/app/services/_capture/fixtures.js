import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import {
  compareLabels,
  subdivisionNamedWithCountry
} from '../countries/country-labels.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const load = (file) =>
  JSON.parse(readFileSync(join(HERE, 'fixtures', file), 'utf8'))

export const countries = load('countries.json')
export const countriesOrigin = load('countries-origin.json')
export const portsOfEntry = load('ports-of-entry.json')

/** { code, name } rows for each SPS origin country in fixture order. */
export const countriesOriginEntries = () =>
  countriesOrigin.map(({ code, name }) => ({ code, name }))

export const countryAndSubdivisionEntriesNamedWithCountry = () => {
  const subdivisions = countriesOrigin.flatMap((country) =>
    (country.subDivisions ?? []).map((subDivision) => ({
      code: subDivision.code,
      name: subdivisionNamedWithCountry(subDivision.name, country.name)
    }))
  )
  return [...countriesOriginEntries(), ...subdivisions].sort((left, right) =>
    compareLabels(left.name, right.name)
  )
}
