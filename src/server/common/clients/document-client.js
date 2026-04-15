import { config } from '../../../config/config.js'
import { createLogger } from '../helpers/logging/logger.js'

const tradeImportsAnimalsBackendUrl = config.get(
  'tradeImportsAnimalsBackendApi.baseUrl'
)
const tracingHeader = config.get('tracing.header')
const logger = createLogger()

export const documentClient = {
  async initiate(notificationRef, request, traceId) {
    const response = await fetch(
      `${tradeImportsAnimalsBackendUrl}/notifications/${notificationRef}/document-uploads`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [tracingHeader]: traceId
        },
        body: JSON.stringify(request)
      }
    )

    if (!response.ok) {
      const error = new Error('Failed to initiate document upload')
      error.status = response.status
      error.statusText = response.statusText

      logger.error(`Failed to initiate document upload: ${error.message}`)

      throw error
    }

    return response.json()
  },

  async getStatus(uploadId, traceId) {
    const response = await fetch(
      `${tradeImportsAnimalsBackendUrl}/document-uploads/${uploadId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          [tracingHeader]: traceId
        }
      }
    )

    if (!response.ok) {
      const error = new Error('Failed to get document upload status')
      error.status = response.status
      error.statusText = response.statusText

      logger.error(`Failed to get document upload status: ${error.message}`)

      throw error
    }

    return response.json()
  }
}
