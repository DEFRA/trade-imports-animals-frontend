import { countriesClient } from '../common/clients/countries-client.js'

const UNITED_KINGDOM = { code: 'GB', name: 'United Kingdom' }

/**
 * Country list for the operator address form. The reference-data SPS list is
 * the 31 EU/EEA members and omits the United Kingdom, but an operator address
 * can be in the UK, so it is added explicitly — as both a selectable option and
 * a valid submission (c-004: country is a display-name string, no code
 * translation). An empty or failed reference-data response still throws:
 * offering only the UK would mask an outage.
 * @param {string} traceId
 * @returns {Promise<Array<{code: string, name: string}>>}
 */
export async function getOperatorFormCountries(traceId) {
  const countries = await countriesClient.getCountries(traceId)

  if (!Array.isArray(countries) || countries.length === 0) {
    throw new Error('Cannot render the operator form without a country list')
  }

  const hasUk = countries.some(
    ({ code, name }) =>
      code === UNITED_KINGDOM.code || name === UNITED_KINGDOM.name
  )

  return hasUk ? countries : [UNITED_KINGDOM, ...countries]
}
