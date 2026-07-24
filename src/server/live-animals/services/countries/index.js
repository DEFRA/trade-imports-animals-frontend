import { COUNTRY_LABELS } from './stub.js'
import { fetchCountries } from './client.js'
import { isRealMode } from '../mode.js'

let labels = { ...COUNTRY_LABELS }

export const prime = async () => {
  if (!isRealMode()) return
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
