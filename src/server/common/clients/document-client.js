import { config } from '../../../config/config.js'
import { createLogger } from '../helpers/logging/logger.js'

const tradeImportsAnimalsBackendUrl = config.get(
  'tradeImportsAnimalsBackendApi.baseUrl'
)
const tracingHeader = config.get('tracing.header')
const logger = createLogger()

const buildFetchError = (message, response) => {
  const error = new Error(message)
  error.status = response.status
  error.statusText = response.statusText
  return error
}

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
      const error = buildFetchError(
        'Failed to initiate document upload',
        response
      )
      logger.error(`Failed to initiate document upload: ${error.message}`)
      throw error
    }

    return response.json()
  },

  async delete(uploadId, traceId) {
    const response = await fetch(
      `${tradeImportsAnimalsBackendUrl}/document-uploads/${uploadId}`,
      {
        method: 'DELETE',
        headers: {
          [tracingHeader]: traceId
        }
      }
    )

    if (!response.ok) {
      const error = buildFetchError(
        'Failed to delete document upload',
        response
      )
      logger.error(`Failed to delete document upload: ${error.message}`)
      throw error
    }
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
      const error = buildFetchError(
        'Failed to get document upload status',
        response
      )
      logger.error(`Failed to get document upload status: ${error.message}`)
      throw error
    }

    return response.json()
  }
}
