import { config } from '../../../config/config.js'
import { createLogger } from '../helpers/logging/logger.js'

const tradeImportsAnimalsBackendUrl = config.get(
  'tradeImportsAnimalsBackendApi.baseUrl'
)
const tracingHeader = config.get('tracing.header')
const logger = createLogger()

const buildRequestInit = (method, traceId, body, rawBody) => {
  const headers = { [tracingHeader]: traceId }
  const init = { method, headers }
  if (body !== undefined) {
    if (rawBody) {
      init.body = body
    } else {
      headers['Content-Type'] = 'application/json'
      init.body = JSON.stringify(body)
    }
  }
  return init
}

const request = async (
  path,
  { method, traceId, body, errorMessage, rawBody = false }
) => {
  const init = buildRequestInit(method, traceId, body, rawBody)
  const response = await fetch(`${tradeImportsAnimalsBackendUrl}${path}`, init)

  if (!response.ok) {
    const error = new Error(errorMessage)
    error.status = response.status
    error.statusText = response.statusText
    logger.error(`${errorMessage}: ${error.status} ${error.message}`)
    throw error
  }

  return response
}

export const documentClient = {
  async initiate(notificationRef, body, traceId) {
    const response = await request(
      `/notifications/${notificationRef}/document-uploads`,
      {
        method: 'POST',
        traceId,
        body,
        errorMessage: 'Failed to initiate document upload'
      }
    )
    return response.json()
  },

  async delete(uploadId, traceId) {
    await request(`/document-uploads/${uploadId}`, {
      method: 'DELETE',
      traceId,
      errorMessage: 'Failed to delete document upload'
    })
  },

  async getStatus(uploadId, traceId) {
    const response = await request(`/document-uploads/${uploadId}`, {
      method: 'GET',
      traceId,
      errorMessage: 'Failed to get document upload status'
    })
    return response.json()
  },

  async streamFile(uploadId, traceId) {
    return request(`/document-uploads/${uploadId}/file`, {
      method: 'GET',
      traceId,
      errorMessage: `Failed to stream file for upload ${uploadId}`
    })
  },

  async uploadFile(uploadId, formData, traceId) {
    await request(`/document-uploads/${uploadId}/file`, {
      method: 'POST',
      traceId,
      body: formData,
      rawBody: true,
      errorMessage: `Failed to upload file for upload ${uploadId}`
    })
  }
}
