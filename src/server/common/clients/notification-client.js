import { config } from '../../../config/config.js'
import { createLogger } from '../helpers/logging/logger.js'
const tradeImportsAnimalsBackendUrl = config.get(
  'tradeImportsAnimalsBackendApi.baseUrl'
)
const tracingHeader = config.get('tracing.header')
const logger = createLogger()

export const notificationClient = {
  async submit(notification, traceId) {
    const response = await fetch(
      `${tradeImportsAnimalsBackendUrl}/notification`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [tracingHeader]: traceId
        },
        body: JSON.stringify(notification)
      }
    )

    if (!response.ok) {
      const error = new Error('Failed to submit notification')
      error.status = response.status
      error.statusText = response.statusText

      logger.error(`Failed to submit notification: ${error.message}`)

      throw error
    }

    return response.json()
  },
  async get(referenceNumber, traceId) {
    const response = await fetch(
      `${tradeImportsAnimalsBackendUrl}/notification/` + referenceNumber,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          [tracingHeader]: traceId
        }
      }
    )
    if (!response.ok) {
      const error = new Error('Failed to get notification')
      error.status = response.status
      error.statusText = response.statusText

      logger.error(`Failed to get notification: ${error.message}`)

      throw error
    }
  }
}
