import { config } from '../../../config/config.js'
import { createLogger } from '../helpers/logging/logger.js'

const tradeImportsReferenceDataUrl = config.get(
  'tradeImportsReferenceDataApi.baseUrl'
)
const tracingHeader = config.get('tracing.header')
const logger = createLogger()

export const portsOfEntryClient = {
  async getPortsOfEntry(traceId) {
    const url = `${tradeImportsReferenceDataUrl}/ports-of-entry`
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        [tracingHeader]: traceId
      }
    })

    if (!response.ok) {
      const error = new Error('Failed to get ports of entry')
      error.status = response.status
      error.statusText = response.statusText

      logger.error(`Failed to get ports of entry: ${error.message}`)

      throw error
    }

    return response.json()
  }
}
