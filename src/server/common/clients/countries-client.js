import { config } from '../../../config/config.js'
import { createLogger } from '../helpers/logging/logger.js'

const tradeImportsReferenceDataUrl = config.get(
  'tradeImportsReferenceDataApi.baseUrl'
)
const tracingHeader = config.get('tracing.header')
const logger = createLogger()

export const countriesClient = {
  /**
   * Retrieves a list of countries from the reference data API,
   * optionally filtered by one or more classifiers
   */
  async getCountries(traceId, classifiers) {
    const url = new URL(`${tradeImportsReferenceDataUrl}/countries`)

    if (classifiers?.length) {
      for (const classifier of classifiers) {
        url.searchParams.append('classifier', classifier)
      }
    }

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
}
