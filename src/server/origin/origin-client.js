import { config } from '../../config/config.js'
import { createLogger } from '../common/helpers/logging/logger.js'

const tradeImportsAnimalsBackendUrl = config.get(
  'tradeImportsAnimalsBackendApi.baseUrl'
)
const tracingHeader = config.get('tracing.header')
const logger = createLogger()

export const originClient = {
  async submit(origin, traceId) {
    const response = await fetch(`${tradeImportsAnimalsBackendUrl}/origin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [tracingHeader]: traceId
      },
      body: JSON.stringify(origin)
    })

    if (!response.ok) {
      const error = new Error('Failed to submit origin')
      error.status = response.status
      error.statusText = response.statusText

      logger.error(`Failed to submit origin: ${error.message}`)

      throw error
    }

    return response.json()
  }
}
