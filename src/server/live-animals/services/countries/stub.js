import { countriesOrigin } from '../_capture/fixtures.js'

export const COUNTRY_LABELS = Object.fromEntries(
  countriesOrigin.map(({ code, name }) => [code, name])
)
