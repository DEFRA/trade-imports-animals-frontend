import { config } from '../../../config/config.js'
import { createLogger } from '../helpers/logging/logger.js'

const tradeImportsReferenceDataUrl = config.get(
  'tradeImportsReferenceDataApi.baseUrl'
)
const tracingHeader = config.get('tracing.header')
const logger = createLogger()

async function fetchCountries(url, traceId) {
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      [tracingHeader]: traceId
    }
  })

  if (!response.ok) {
    const error = new Error('Failed to get countries')
    error.status = response.status
    error.statusText = response.statusText

    logger.error(`Failed to get countries: ${error.message}`)

    throw error
  }

  return response.json()
}

export const countriesClient = {
  /**
   * Retrieves a list of countries from the reference data API,
   * optionally filtered by one or more blocks
   */
  async getCountries(traceId, blocks) {
    const url = new URL(`${tradeImportsReferenceDataUrl}/countries`)

    if (blocks?.length) {
      for (const block of blocks) {
        url.searchParams.append('blocks', block)
      }
    }

    return fetchCountries(url, traceId)
  },

  /**
   * Retrieves ISO countries from the reference data API (MDM system=ISO).
   */
  async getIsoCountries(traceId) {
    const url = new URL(`${tradeImportsReferenceDataUrl}/countries`)
    url.searchParams.set('system', 'ISO')

    return fetchCountries(url, traceId)
  }
}
