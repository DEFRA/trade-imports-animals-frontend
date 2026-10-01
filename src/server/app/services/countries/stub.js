import { countriesOrigin } from '../_capture/fixtures.js'

export const COUNTRY_LABELS = Object.fromEntries(
  countriesOrigin.map(({ code, name }) => [code, name])
)

const subdivisionLabels = {}
const subdivisionToParent = {}

for (const country of countriesOrigin) {
  for (const subdivision of country.subDivisions ?? []) {
    subdivisionLabels[subdivision.code] = subdivision.name
    subdivisionToParent[subdivision.code] = country.code
  }
}

export const COUNTRY_SUBDIVISIONS = {
  labels: subdivisionLabels,
  parents: subdivisionToParent
}
