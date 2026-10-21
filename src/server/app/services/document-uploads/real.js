import { getTraceId } from '@defra/hapi-tracing'
import { backendFetch } from '../../../common/helpers/call-counts/backend-fetch.js'

const backendBaseUrl =
  process.env.TRADE_IMPORTS_ANIMALS_BACKEND_URL ?? 'http://localhost:8085'
const tracingHeader = process.env.TRACING_HEADER ?? 'x-cdp-request-id'

const failed = (action, response) => {
  const error = new Error(
    `Failed to ${action}: ${response.status} ${response.statusText}`
  )
  error.status = response.status
  error.statusText = response.statusText
  return error
}

const traceHeaders = (contentType) => ({
  ...(contentType ? { 'Content-Type': contentType } : {}),
  [tracingHeader]: getTraceId() ?? ''
})

const rejectionReasonOf = (files) =>
  files?.find((file) => file.hasError)?.errorMessage ?? null

const HTTP_NOT_FOUND = 404

export const documentUploads = {
  register: async ({ journeyId, uploadId, correlationId }) => {
    const response = await backendFetch(
      `${backendBaseUrl}/notifications/${journeyId}/document-uploads`,
      {
        method: 'POST',
        headers: traceHeaders('application/json'),
        body: JSON.stringify({ uploadId, correlationId })
      }
    )
    if (!response.ok) {
      throw failed('register document upload', response)
    }
  },

  claim: async ({ uploadId, documentType, documentReference, dateOfIssue }) => {
    const response = await backendFetch(
      `${backendBaseUrl}/document-uploads/${uploadId}/claim`,
      {
        method: 'POST',
        headers: traceHeaders('application/json'),
        body: JSON.stringify({ documentType, documentReference, dateOfIssue })
      }
    )
    if (!response.ok) {
      throw failed('claim document upload', response)
    }
  },

  findByCorrelationId: async ({ journeyId, correlationId }) => {
    const response = await backendFetch(
      `${backendBaseUrl}/notifications/${journeyId}/document-upload-sessions/${correlationId}`,
      { method: 'GET', headers: traceHeaders() }
    )
    if (response.status === HTTP_NOT_FOUND) {
      return undefined
    }
    if (!response.ok) {
      throw failed('get document upload session', response)
    }
    return response.json()
  },

  scanStatus: async ({ uploadId }) => {
    const response = await backendFetch(
      `${backendBaseUrl}/document-uploads/${uploadId}`,
      { method: 'GET', headers: traceHeaders() }
    )
    if (!response.ok) {
      throw failed('get document upload status', response)
    }
    const { scanStatus, files } = await response.json()
    return { scanStatus, rejectionReason: rejectionReasonOf(files) }
  },

  remove: async (uploadId) => {
    const response = await backendFetch(
      `${backendBaseUrl}/document-uploads/${uploadId}`,
      { method: 'DELETE', headers: traceHeaders() }
    )
    if (!response.ok) {
      throw failed('delete document upload', response)
    }
  },

  streamFile: async (uploadId) => {
    const response = await backendFetch(
      `${backendBaseUrl}/document-uploads/${uploadId}/file`,
      { method: 'GET', headers: traceHeaders() }
    )
    if (!response.ok) {
      throw failed('stream document file', response)
    }
    return response
  }
}
